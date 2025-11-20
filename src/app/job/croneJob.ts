import cron from 'node-cron';
import { pubClient } from '../redis';
import Message from '../modules/messages/messages.models';
import { notificationServices } from '../modules/notification/notification.service';

cron.schedule('*/10 * * * * *', async () => {
  const keys = await pubClient.keys('chat:*:messages');

  if (keys?.length > 0) {
    console.log('🚀 ~ keys:', keys);
    for (const key of keys) {
      const messages = await pubClient.lRange(key, 0, -1);
      if (!messages.length) continue;
      const parsedMessages = messages.map(msg => JSON.parse(msg));
      await Message.insertMany(parsedMessages);
      // await prisma.message.createMany({ data: parsedMessages });
      await pubClient.del(key);
    }
  }

  console.log('✅ Redis messages saved to DB');
});

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