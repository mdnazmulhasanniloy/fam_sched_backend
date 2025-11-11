import cron from 'node-cron';
import { pubClient } from '../redis';
import Message from '../modules/messages/messages.models';

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
