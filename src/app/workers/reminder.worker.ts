import { Worker } from 'bullmq';
import { IEvents } from '../modules/events/events.interface';
import { sendSingleNotification } from '../utils/sendNotification';
import Events from '../modules/events/events.models';
import { IUser } from '../modules/user/user.interface';

new Worker(
  'reminder_queue',
  async job => {
    const { eventId } = job.data;
    const event: IEvents | null = await Events.findById(eventId).populate([
      { path: 'includeInSchedule', select: '_id fcmToken' },
      { path: 'assignTo', select: '_id fcmToken' },
      { path: 'user', select: '_id fcmToken' },
    ]);

    if (!event || event.isDeleted) return;

    console.log('🔔 Sending reminder for:', event.title);

    const tokens: { token: string; userId: string }[] = [];

    if (event.assignTo)
      tokens.push({
        token: (event.assignTo as IUser).fcmToken,
        userId: (event.assignTo as IUser)._id?.toString(),
      });

    if (event?.includeInSchedule?.length)
      (event?.includeInSchedule as IUser[])?.forEach(u =>
        tokens.push({ token: u.fcmToken, userId: u._id?.toString() }),
      );
    if (event?.isAssignMe && event?.user)
      tokens.push({
        token: (event.user as IUser).fcmToken,
        userId: (event.user as IUser)._id?.toString(),
      });

    for (const t of tokens) {
      await sendSingleNotification(t.token, {
        title: 'Task Reminder',
        body: `Reminder for ${event.title}`,
        userId: t.userId,
        save: true,
        data: event,
      });
    }
  },
  { connection: { host: 'localhost', port: 6379 } },
);
