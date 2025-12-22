import cron from 'node-cron';
import { pubClient } from '../redis'; 
import { notificationServices } from '../modules/notification/notification.service';



const flushNotifications = async (channel: string) => {
  try {
    // Read all notifications from Redis
    const notifications = await pubClient.lRange(channel, 0, -1);

    if (!notifications.length) return;

    notifications.map(
      async n =>
        await notificationServices.insertNotificationIntoDb(JSON.parse(n)),
    );

    // Save to MongoDB
    // Remove the flushed notifications from Redis
    await pubClient.del(channel);

    console.log(`✅ Saved  notifications from "${channel}" to DB`);
  } catch (err) {
    console.error(`❌ Error flushing notifications from "${channel}":`, err);
  }
};

cron.schedule('*/30 * * * * *', async () => {
  console.log('🔄 Running notification scheduler...');
  await flushNotifications('notification');
});