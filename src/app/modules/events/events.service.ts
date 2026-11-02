/* eslint-disable no-undefined */
import httpStatus from 'http-status';
import { IEvents } from './events.interface';
import Events from './events.models';
import AppError from '../../error/AppError';
import { eventQueue, notificationQueue, pubClient } from '../../redis';
import QueryBuilder from '../../core/builder/QueryBuilder';
import moment from 'moment-timezone';
import {
  calculateReminderTime,
  convertEventToUserTZ,
  formatReminderText,
  generateRecurringDates,
  isEnabledReminder,
} from './events.utils';
import { User } from '../user/user.models';
import { modeType } from '../notification/notification.interface';
import { sendSingleNotification } from '../../utils/sendNotification';

const notifyUserAboutEvent = async ({
  userId,
  title,
  body,
  referenceId,
  type,
}: {
  userId: string;
  title: string;
  body: string;
  referenceId: string;
  type: 'event_assigned' | 'event_accepted' | 'event_rejected';
}) => {
  const user = await User.findById(userId).select('fcmToken notification');
  if (!user) return;

  if (user.fcmToken && user.notification) {
    try {
      await sendSingleNotification(user.fcmToken, {
        title,
        body,
        userId,
        save: true,
        type,
        referenceId,
        data: {
          id: referenceId,
          _id: referenceId,
        },
      });
      return;
    } catch (err) {
      console.error('Push notification failed:', err);
    }
  }

  await notificationQueue.add('send_notification', {
    receiver: userId,
    message: title,
    description: body,
    refference: referenceId,
    model_type: modeType.Events,
    type,
  });
};

const notifyEventAssignee = async (
  event: IEvents,
  reason: 'created' | 'updated' = 'created',
) => {
  const assigneeId = event.assignTo?.toString();
  const creatorId = event.user?.toString();
  if (!assigneeId || !creatorId || assigneeId === creatorId) return;

  const creator = await User.findById(creatorId).select('name');
  const creatorName = creator?.name || 'Someone';
  const updated = reason === 'updated';

  await notifyUserAboutEvent({
    userId: assigneeId,
    title: updated ? 'Event updated' : 'New event assigned',
    body: updated
      ? `${creatorName} updated ${event.title}. Please accept or decline again.`
      : `${creatorName} assigned you ${event.title}. Please accept or decline.`,
    referenceId: event._id.toString(),
    type: 'event_assigned',
  });
};

const scheduleReminderJobs = async (event: IEvents, userIds: Set<string>) => {
  const timezone = event.timezone || 'UTC';
  const dates = generateRecurringDates(
    event.startEvent!,
    event.endEvent!,
    event.recurring,
    timezone,
  );
  const reminders = [event.remainder1, event.remainder2, event.remainder3];
  const now = Date.now();
  const jobIds: string[] = [];
  const scheduledWindows = new Set<string>();

  for (const date of dates) {
    for (const reminder of reminders) {
      if (!isEnabledReminder(reminder)) continue;

      const reminderTime = calculateReminderTime(
        date,
        reminder.value,
        reminder.unit,
        timezone,
      );
      if (!reminderTime || reminderTime.getTime() < now) continue;

      const eventTime = moment.utc(event.startEvent).tz(timezone).format('hh:mm A');
      const reminderText = formatReminderText(reminder.value, reminder.unit);
      const title = 'Upcoming event';
      const body = `${event.title} starts in ${reminderText} at ${eventTime}.`;
      const delay = Math.max(0, reminderTime.getTime() - now);

      for (const userId of userIds) {
        const windowKey = `${userId}-${reminderTime.getTime()}`;
        if (scheduledWindows.has(windowKey)) continue;
        scheduledWindows.add(windowKey);

        const jobId = `reminder-${event._id}-${userId}-${reminderTime.getTime()}`;
        const dedupeKey = `${event._id}:${userId}:${reminderTime.getTime()}`;
        try {
          const job = await eventQueue.add(
            'send_event_notification',
            {
              eventId: event._id,
              userId,
              title,
              body,
              reminderValue: reminder.value,
              reminderUnit: reminder.unit,
              dedupeKey,
            },
            { delay, jobId },
          );
          jobIds.push(String(job.id));
        } catch (err: any) {
          if (String(err?.message || '').toLowerCase().includes('already exists')) {
            jobIds.push(jobId);
            continue;
          }
          throw err;
        }
      }
    }
  }

  return jobIds;
};

const createEvents = async (payload: IEvents) => {
  const session = await Events.startSession();
  session.startTransaction();

  try {
    // Clean timezone - remove spaces
    payload.timezone = (payload.timezone || 'UTC').replace(/\s+/g, '');
    delete payload.assignmentStatus;
    delete payload.respondedAt;

    const creatorId = payload.user?.toString();
    const assigneeId = payload.assignTo?.toString();
    const requiresResponse = Boolean(
      assigneeId && creatorId && assigneeId !== creatorId,
    );

    if (requiresResponse) {
      payload.assignmentStatus = 'pending';
      payload.respondedAt = null;
    } else if (assigneeId) {
      payload.assignmentStatus = 'accepted';
      payload.respondedAt = new Date();
    }

    // ✅ 1. Convert to UTC BEFORE saving
    payload.isCompleted = false;
    console.log('Original payload:', payload);
    if (payload.startEvent) {
      payload.startEvent = moment
        .tz(payload.startEvent, payload.timezone || 'UTC')
        .utc()
        .toDate();
      // payload.startEvent = moment(payload.startEvent).utc().toDate();
    }

    if (payload.endEvent) {
      payload.endEvent = moment
        .tz(payload.endEvent, payload.timezone || 'UTC')
        .utc()
        .toDate();
      // payload.endEvent = moment(payload.endEvent).utc().toDate();
    }

    if (payload.startEvent && payload.endEvent) {
      if (moment(payload.endEvent).isBefore(moment(payload.startEvent))) {
        throw new AppError(400, 'End date must be after start date');
      }
    }

    // ✅ 2. Create event
    const result = await Events.create([payload], { session });
    const event = result[0];

    if (!event) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create events');
    }

    // ✅ 3. Collect users
    const usersToNotify = new Set<string>();

    if (event.assignTo) usersToNotify.add(event.assignTo.toString());
    if (event.isAssignMe && event.user) {
      usersToNotify.add(event.user.toString());
    }

    if (event.includeInSchedule?.length) {
      event.includeInSchedule.forEach(u => usersToNotify.add(u.toString()));
    }

    // ❗ Safety check
    if (!usersToNotify.size) {
      console.warn('⚠️ No users to notify');
    }

    // ✅ 4. Schedule jobs. value 0 is "No Reminder" and is not queued.
    const allJobIds = await scheduleReminderJobs(event, usersToNotify);

    console.log('✅ Created jobs:', allJobIds);

    // ✅ 6. Save jobIds
    if (allJobIds.length) {
      event.jobIds = allJobIds;
      await event.save({ session });
    }

    await session.commitTransaction();

    // ✅ 7. Clear cache
    try {
      await pubClient.del(`events:${event._id}`);
      const keys = await pubClient.keys('events:*');
      if (keys.length) await pubClient.del(keys);
    } catch (err) {
      console.error('Redis cache error:', err);
    }

    if (requiresResponse) {
      try {
        await notifyEventAssignee(event);
      } catch (notifyErr) {
        console.error('Assignment notification failed:', notifyErr);
      }
    }

    return event;
  } catch (err) {
    await session.abortTransaction();
    console.error('Create event rollback:', err);
    throw err;
  } finally {
    session.endSession();
  }
};

const getAllEvents = async (query: Record<string, any>, userId: string) => {
  try {
    const cacheKey = 'events:' + userId + ':' + JSON.stringify(query);
    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    const eventsModel = new QueryBuilder(
      Events.find({
        isDeleted: false,
        $or: [
          { user: userId },
          { assignmentStatus: { $ne: 'rejected' } },
        ],
      }),
      query,
    )
      .search([''])
      .filter()
      .paginate()
      .sort()
      .fields();

    const [data, meta, user] = await Promise.all([
      eventsModel.modelQuery,
      eventsModel.countTotal(),
      User.findById(userId).select('timezone'),
    ]);

    // Default to user's timezone, or UTC if not set
    const userTimezone = (user?.timezone || 'UTC').replace(/\s+/g, '');

    // const meta = await eventsModel.countTotal();
    if (!userTimezone && data?.length === 0) {
      return {
        data,
        meta,
      };
    }

    const convertedData = data?.map((event: any) =>
      convertEventToUserTZ(
        event.toObject ? event.toObject() : event,
        userTimezone,
      ),
    );
    const response = { data: convertedData, meta };

    // 3. Store in cache (30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(response), { EX: 30 });

    return response;
  } catch (err) {
    console.error('Redis caching error (getAllEvents):', err);
    const eventsModel = new QueryBuilder(
      Events.find({
        isDeleted: false,
        $or: [
          { user: userId },
          { assignmentStatus: { $ne: 'rejected' } },
        ],
      }),
      query,
    )
      .search([''])
      .filter()
      .paginate()
      .sort()
      .fields();

    const data = await eventsModel.modelQuery;
    const meta = await eventsModel.countTotal();

    return {
      data,
      meta,
    };
  }
};

const getEventsById = async (id: string, userId: string) => {
  try {
    console.log({
      id,
      userId,
    });
    const cacheKey = 'events:' + id + ':' + userId;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Fetch from DB

    const [event, user] = await Promise.all([
      Events.findById(id),
      // Assuming you have a User model to fetch user details
      User.findById(userId).select('timezone'),
    ]);
    if (!event || event?.isDeleted) {
      throw new Error('Events not found!');
    }
    const result = convertEventToUserTZ(event.toObject(), user!.timezone);
    // 3. Store in cache (e.g., 30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(result), { EX: 30 });

    return result;
  } catch (err) {
    console.error('Redis caching error (geEventsById):', err);
    const result = await Events.findById(id);
    if (!result || result?.isDeleted) {
      throw new Error('Events not found!');
    }
    return result;
  }
};

const updateEvents = async (id: string, payload: Partial<IEvents>) => {
  const session = await Events.startSession();
  session.startTransaction();

  try {
    delete payload.assignmentStatus;
    delete payload.respondedAt;

    // Clean timezone - remove spaces
    if (payload.timezone) {
      payload.timezone = (payload.timezone as string).replace(/\s+/g, '');
    }

    // Convert date to UTC
    if (payload.startEvent) {
      payload.startEvent = moment
        .tz(payload.startEvent, (payload.timezone as string) || 'UTC')
        .utc()
        .toDate();
      // payload.startEvent = moment(payload.startEvent).utc().toDate();
    }

    if (payload.endEvent) {
      payload.endEvent = moment
        .tz(payload.endEvent, (payload.timezone as string) || 'UTC')
        .utc()
        .toDate();
      // payload.endEvent = moment(payload.endEvent).utc().toDate();
    }

    if (payload.startEvent && payload.endEvent) {
      if (moment(payload.endEvent).isBefore(moment(payload.startEvent))) {
        throw new AppError(400, 'End date must be after start date');
      }
    }

    // =============== 1️⃣ Fetch Existing Event ===============
    const oldEvent = await Events.findById(id).session(session);

    if (!oldEvent) {
      throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
    }

    // =============== 2️⃣ DELETE OLD JOBS =================
    if (oldEvent.jobIds?.length) {
      for (const jobId of oldEvent.jobIds) {
        try {
          const job = await eventQueue.getJob(jobId);
          if (job) await job.remove();
        } catch (err) {
          console.error('Job removal error:', err);
        }
      }
    }

    // Clear old jobIds inside DB
    oldEvent.jobIds = [];
    await oldEvent.save({ session });

    // =============== 3️⃣ Update Event Data ===============
    const updatedEvent = await Events.findByIdAndUpdate(id, payload, {
      new: true,
      session,
    });

    if (!updatedEvent) {
      throw new Error('Event update failed!');
    }

    // =============== 4️⃣ Build User Notification List ===============
    const usersToNotify = new Set<string>();

    if (updatedEvent.assignTo)
      usersToNotify.add(updatedEvent.assignTo.toString());

    if (updatedEvent.isAssignMe && updatedEvent.user)
      usersToNotify.add(updatedEvent.user.toString());

    if (updatedEvent.includeInSchedule?.length) {
      updatedEvent.includeInSchedule.forEach(u =>
        usersToNotify.add(u.toString()),
      );
    }

    // =============== 5️⃣ Generate Dates & Reminders ===============
    const newJobIds = await scheduleReminderJobs(updatedEvent, usersToNotify);

    // =============== 6️⃣ Insert New JobIds Safely ===============
    if (newJobIds.length) {
      updatedEvent.jobIds = newJobIds;
      await updatedEvent.save({ session });
    }

    const previousAssignee = oldEvent.assignTo?.toString();
    const nextAssignee = updatedEvent.assignTo?.toString();
    const ownerId = updatedEvent.user?.toString();
    const assigneeChanged = nextAssignee !== previousAssignee;
    let notifyAssignee = false;

    if (nextAssignee && ownerId && nextAssignee !== ownerId) {
      updatedEvent.assignmentStatus = 'pending';
      updatedEvent.respondedAt = null;
      notifyAssignee = true;
      await updatedEvent.save({ session });
    } else if (assigneeChanged && nextAssignee && nextAssignee === ownerId) {
      updatedEvent.assignmentStatus = 'accepted';
      updatedEvent.respondedAt = new Date();
      await updatedEvent.save({ session });
    }

    // =============== 7️⃣ Commit Transaction ===============
    await session.commitTransaction();

    // =============== 8️⃣ Redis Cache Cleanup ===============
    await pubClient.del(`events:${id}`);
    const keys = await pubClient.keys('events:*');
    if (keys.length) await pubClient.del(keys);

    if (notifyAssignee) {
      try {
        await notifyEventAssignee(
          updatedEvent,
          assigneeChanged ? 'created' : 'updated',
        );
      } catch (notifyErr) {
        console.error('Assignment notification failed:', notifyErr);
      }
    }

    return updatedEvent;
  } catch (err) {
    console.error('Update event rollback:', err);
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const deleteEvents = async (id: string) => {
  const session = await Events.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Fetch event
    const event = await Events.findById(id).session(session);
    if (!event) {
      throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
    }

    // 2️⃣ Remove all scheduled jobs
    if (event.jobIds?.length) {
      for (const jobId of event.jobIds) {
        try {
          const job = await eventQueue.getJob(jobId);
          if (job) await job.remove();
        } catch (err) {
          console.error('Job removal error:', err);
        }
      }
    }

    // 3️⃣ Mark event as deleted & clear jobIds
    event.isDeleted = true;
    event.jobIds = [];
    await event.save({ session });

    // 4️⃣ Commit transaction
    await session.commitTransaction();

    // 5️⃣ Redis cache invalidation
    try {
      await pubClient.del(`events:${id}`);
      const keys = await pubClient.keys('events:*');
      if (keys.length) await pubClient.del(keys);
    } catch (err) {
      console.error('Redis cache invalidation error (deleteEvents):', err);
    }

    return event;
  } catch (err) {
    console.error('Delete event rollback:', err);
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const respondToAssignment = async (
  id: string,
  userId: string,
  status: 'accepted' | 'rejected',
) => {
  const event = await Events.findById(id);
  if (!event || event.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const assigneeId = event.assignTo?.toString();
  const creatorId = event.user?.toString();

  if (!assigneeId || !creatorId || assigneeId === creatorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This event does not require a response',
    );
  }

  if (assigneeId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the assigned member can respond to this event',
    );
  }

  if (event.assignmentStatus === status) {
    return event;
  }

  event.assignmentStatus = status;
  event.respondedAt = new Date();
  await event.save();

  try {
    await pubClient.del(`events:${id}`);
    const keys = await pubClient.keys('events:*');
    if (keys.length) await pubClient.del(keys);
  } catch (err) {
    console.error('Redis cache error:', err);
  }

  try {
    const assignee = await User.findById(userId).select('name');
    const assigneeName = assignee?.name || 'A member';
    const accepted = status === 'accepted';
    await notifyUserAboutEvent({
      userId: creatorId,
      title: accepted ? 'Event accepted' : 'Event declined',
      body: `${assigneeName} ${accepted ? 'accepted' : 'declined'} ${event.title}.`,
      referenceId: event._id.toString(),
      type: accepted ? 'event_accepted' : 'event_rejected',
    });
  } catch (err) {
    console.error('Response notification failed:', err);
  }

  return event;
};

export const eventsService = {
  createEvents,
  getAllEvents,
  getEventsById,
  updateEvents,
  deleteEvents,
  respondToAssignment,
};
