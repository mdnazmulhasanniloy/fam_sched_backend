import { Worker } from 'bullmq';
import { User } from '../modules/user/user.models';
import { sendSingleNotification } from '../utils/sendNotification';
import { connection, notificationQueue } from '../redis';
import { modeType } from '../modules/notification/notification.interface';
import Events from '../modules/events/events.models';

new Worker(
  'event_notification',
  async job => {
    const { eventId, userId, title, body } = job.data;

    const event = await Events.findById(eventId);

    const user = await User.findById(userId);
    if (!user?.fcmToken && !user?.notification) {
      await notificationQueue.add('send_notification', {
        receiver: userId,
        message: title,
        data: event,
        description: body,
        refference: eventId,
        model_type: modeType.Events,
      });
      return;
    }

    await sendSingleNotification(user.fcmToken, {
      title: title,
      body: body,
      data: event,
      userId: user?._id?.toString(),
      token: user.fcmToken,
    });

    console.log('📨 Notification sent for Event:', eventId);
  },
  {
    connection: connection,
  },
);

console.log('⚡ Event worker running...');
