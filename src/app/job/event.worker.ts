import { Worker } from 'bullmq';
import { User } from '../modules/user/user.models';
import { sendSingleNotification } from '../utils/sendNotification';
import { connection, notificationQueue } from '../redis';
import { modeType } from '../modules/notification/notification.interface';
import { Notification } from '../modules/notification/notification.model';
import Events from '../modules/events/events.models';

new Worker(
  'event_notification',
  async job => {
    const { eventId, userId, title, body, dedupeKey, reminderValue } = job.data;

    if (typeof reminderValue === 'number' && reminderValue <= 0) {
      console.log('Skipping disabled reminder for event:', eventId);
      return;
    }
    if (typeof body === 'string' && /\bstarts in 0 \w+/.test(body)) {
      console.log('Skipping zero-value reminder already queued:', eventId);
      return;
    }
    if (dedupeKey && (await Notification.exists({ dedupeKey }))) {
      console.log('Skipping duplicate reminder:', dedupeKey);
      return;
    }

    const event = await Events.findById(eventId);

    const user = await User.findById(userId); 

    if (!user?.fcmToken || !user?.notification) {
      console.log(
        'User not found or has no FCM token or notifications disabled',
      );
      await notificationQueue.add('send_notification', {
        receiver: userId,
        message: title,
        data: event,
        description: body,
        refference: eventId,
        model_type: modeType.Events,
        ...(dedupeKey ? { dedupeKey } : {}),
      });
      return;
    }

     

    await sendSingleNotification(user.fcmToken, {
      title: title,
      body: body,
      data: event,
      userId: user?._id?.toString(),
      token: user.fcmToken,
      referenceId: eventId,
      dedupeKey,
    });

    console.log('📨 Notification sent for Event:', eventId);
  },
  {
    connection: connection,
  },
);

console.log('⚡ Event worker running...');
