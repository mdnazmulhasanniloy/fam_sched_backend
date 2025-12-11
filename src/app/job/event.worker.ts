import { Worker } from 'bullmq';
import { User } from '../modules/user/user.models';
import { sendSingleNotification } from '../utils/sendNotification';
import { notificationQueue } from '../redis';
import { modeType } from '../modules/notification/notification.interface';

new Worker(
  'event_notification',
  async job => {
    const { eventId, userId, title, body } = job.data;

    const user = await User.findById(userId);
    if (!user?.fcmToken) {
      await notificationQueue.add('send_notification', {
        receiver: userId,
        message: title,
        description: body,
        refference: eventId,
        model_type: modeType.Events,
      });
      return;
    }

    await sendSingleNotification(user.fcmToken, {
      title: title,
      body: body,
      data: eventId,
      userId: user?._id?.toString(),
      token: user.fcmToken,
    });

    console.log('📨 Notification sent for Event:', eventId);
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  },
);

console.log('⚡ Event worker running...');
