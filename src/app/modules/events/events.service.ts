import httpStatus from 'http-status';
import { IEvents } from './events.interface';
import Events from './events.models';
import AppError from '../../error/AppError';
import { eventQueue, pubClient } from '../../redis';
import QueryBuilder from '../../core/builder/QueryBuilder';
import moment from 'moment';
import { calculateReminderTime, generateRecurringDates } from './events.utils';

// const createEvents = async (payload: IEvents) => {
//   if (payload.startEvent) {
//     payload.startEvent = moment(payload.startEvent).utc().toDate();
//   } 

//   if (payload.endEvent) {
//     payload.endEvent = moment(payload.endEvent).utc().toDate();
//   }

//   const result = await Events.create(payload);
//   if (!result) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create events');
//   }

//   // ============================
//   // 🔥 Step 1: All event dates
//   // ============================
//   const dates = generateRecurringDates(
//     result.startEvent!,
//     result.endEvent!,
//     result.recurring,
//   );

//   for (const date of dates) {
//     const reminders = [result.remainder1, result.remainder2, result.remainder3];

//     for (const r of reminders) {
//       const reminderTime = calculateReminderTime(date, r?.value, r?.unit);

//       if (!reminderTime) continue;
//       if (reminderTime < new Date()) continue; // skip past time

//       const delay = reminderTime.getTime() - Date.now();

//       if (result?.assignTo) {
//         await eventQueue.add(
//           'send_event_notification',
//           {
//             eventId: result?._id,
//             userId: result?.assignTo,
//             title: `Recurring Reminder: ${result?.title}`,
//             body: `You have a recurring event ${result?.title}. Don't forget to follow your schedule.`,
//           },
//           { delay },
//         );
//       }

//       if (result?.includeInSchedule?.length) {
//         for (const user of result?.includeInSchedule) {
//           await eventQueue.add(
//             'send_event_notification',
//             {
//               eventId: result._id,
//               userId: user,
//               title: `Recurring Reminder: ${result?.title}`,
//               body: `You have a recurring event ${result?.title}. Don't forget to follow your schedule.`,
//             },
//             { delay },
//           );
//         }
//       }

//       if (result?.isAssignMe) {
//         await eventQueue.add(
//           'send_event_notification',
//           {
//             eventId: result._id,
//             userId: result.user,
//             title: `Recurring Reminder: ${result?.title}`,
//             body: `You have a recurring event ${result?.title}. Don't forget to follow your schedule.`,
//           },
//           { delay },
//         );
//       }
//     }
//   }

//   // 🔹 Redis cache invalidation
//   try {
//     // Clear all events list caches
//     const keys = await pubClient.keys('events:*');
//     if (keys.length > 0) {
//       await pubClient.del(keys);
//     }

//     // Optionally, clear single events cache if updating an existing unverified events
//     if (result?._id) {
//       await pubClient.del('events:' + result?._id?.toString());
//     }
//   } catch (err) {
//     console.error('Redis cache invalidation error (createEvents):', err);
//   }

//   return result;
// };

const createEvents = async (payload: IEvents) => {
  const session = await Events.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Convert dates to UTC
    if (payload.startEvent) {
      payload.startEvent = moment(payload.startEvent).utc().toDate();
    }
    if (payload.endEvent) {
      payload.endEvent = moment(payload.endEvent).utc().toDate();
    }

    // 2️⃣ Create event
    const result = await Events.create([payload], { session });
    const event = result[0];

    if (!event) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create events');
    }

    // 3️⃣ Collect all target users (unique)
    const usersToNotify = new Set<string>();
    if (event.assignTo) usersToNotify.add(event.assignTo.toString());
    if (event.isAssignMe && event.user)
      usersToNotify.add(event.user.toString());
    if (event.includeInSchedule?.length) {
      event.includeInSchedule.forEach(u => usersToNotify.add(u.toString()));
    }

    // 4️⃣ Generate recurring dates
    const dates = generateRecurringDates(
      event.startEvent!,
      event.endEvent!,
      event.recurring,
    );
    const reminders = [event.remainder1, event.remainder2, event.remainder3];
    const allJobIds: any[] = [];

    // 5️⃣ Schedule jobs
    for (const date of dates) {
      for (const r of reminders) {
        if (!r?.value || !r?.unit) continue;

        const reminderTime = calculateReminderTime(date, r.value, r.unit);
        if (!reminderTime || reminderTime < new Date()) continue;

        const delay = reminderTime.getTime() - Date.now();

        for (const userId of usersToNotify) {
          const job = await eventQueue.add(
            'send_event_notification',
            {
              eventId: event._id,
              userId,
              title: `Recurring Reminder: ${event.title}`,
              body: `You have a recurring event ${event.title}. Don't forget to follow your schedule.`,
            },
            { delay },
          );
          allJobIds.push(job.id);
        }
      }
    }

    // 6️⃣ Save all jobIds in bulk
    if (allJobIds.length) {
      event.jobIds = allJobIds;
      await event.save({ session });
    }

    // 7️⃣ Commit transaction
    await session.commitTransaction();

    // 8️⃣ Redis cache cleanup
    try {
      await pubClient.del(`events:${event._id}`);
      const keys = await pubClient.keys('events:*');
      if (keys.length) await pubClient.del(keys);
    } catch (err) {
      console.error('Redis cache invalidation error (createEvents):', err);
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

const getAllEvents = async (query: Record<string, any>) => {
  try {
    const cacheKey = 'events:' + JSON.stringify(query);
    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    const eventsModel = new QueryBuilder(
      Events.find({ isDeleted: false }),
      query,
    )
      .search([''])
      .filter()
      .paginate()
      .sort()
      .fields();

    const data = await eventsModel.modelQuery;
    const meta = await eventsModel.countTotal();

    const response = { data, meta };

    // 3. Store in cache (30s TTL)
    await pubClient.set(cacheKey, JSON.stringify(response), { EX: 30 });

    return response;
  } catch (err) {
    console.error('Redis caching error (getAllEvents):', err);
    const eventsModel = new QueryBuilder(
      Events.find({ isDeleted: false }),
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

const getEventsById = async (id: string) => {
  try {
    const cacheKey = 'events:' + id;

    // 1. Check cache
    const cachedData = await pubClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 2. Fetch from DB
    const result = await Events.findById(id);
    if (!result || result?.isDeleted) {
      throw new Error('Events not found!');
    }

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
    // Convert date to UTC
    if (payload.startEvent) {
      payload.startEvent = moment(payload.startEvent).utc().toDate();
    }

    if (payload.endEvent) {
      payload.endEvent = moment(payload.endEvent).utc().toDate();
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
    const dates = generateRecurringDates(
      updatedEvent.startEvent!,
      updatedEvent.endEvent!,
      updatedEvent.recurring,
    );

    const reminders = [
      updatedEvent.remainder1,
      updatedEvent.remainder2,
      updatedEvent.remainder3,
    ];

    const newJobIds: any[] = [];

    for (const date of dates) {
      for (const r of reminders) {
        if (!r?.value || !r?.unit) continue;

        const reminderTime = calculateReminderTime(date, r.value, r.unit);
        if (!reminderTime || reminderTime < new Date()) continue;

        const delay = reminderTime.getTime() - Date.now();

        for (const userId of usersToNotify) {
          const job = await eventQueue.add(
            'send_event_notification',
            {
              eventId: updatedEvent._id,
              userId,
              title: `Recurring Reminder: ${updatedEvent.title}`,
              body: `You have a recurring event ${updatedEvent.title}. Don't forget to follow your schedule.`,
            },
            { delay },
          );

          newJobIds.push(job.id);
        }
      }
    }

    // =============== 6️⃣ Insert New JobIds Safely ===============
    if (newJobIds.length) {
      updatedEvent.jobIds = newJobIds;
      await updatedEvent.save({ session });
    }

    // =============== 7️⃣ Commit Transaction ===============
    await session.commitTransaction();

    // =============== 8️⃣ Redis Cache Cleanup ===============
    await pubClient.del(`events:${id}`);
    const keys = await pubClient.keys('events:*');
    if (keys.length) await pubClient.del(keys);

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

export const eventsService = {
  createEvents,
  getAllEvents,
  getEventsById,
  updateEvents,
  deleteEvents,
};
