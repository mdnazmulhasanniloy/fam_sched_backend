import { Worker } from 'bullmq';
import { pubClient } from '../redis';
import { notificationServices } from '../modules/notification/notification.service';

new Worker(
  'notification_flush',
  async () => {
    const channel = 'notification';
    const notifications = await pubClient.lRange(channel, 0, -1);
    if (!notifications.length) return;

    for (const item of notifications) {
      await notificationServices.insertNotificationIntoDb(JSON.parse(item));
    }

    await pubClient.del(channel);

    console.log(`✅ Notifications saved to DB`);
  },
  { connection: { host: 'localhost', port: 6379 } },
);
