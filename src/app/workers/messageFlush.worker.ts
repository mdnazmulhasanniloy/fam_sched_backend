import { Worker } from 'bullmq';
import { pubClient } from '../redis';
import Message from '../modules/messages/messages.models';

new Worker(
  'message_flush',
  async () => {
    const keys = await pubClient.keys('chat:*:messages');

    for (const key of keys) {
      const messages = await pubClient.lRange(key, 0, -1);
      if (!messages.length) continue;

      const parsed = messages.map(m => JSON.parse(m));
      await Message.insertMany(parsed);
      await pubClient.del(key);
    }

    console.log('✅ Messages flushed to DB');
  },
  { connection: { host: 'localhost', port: 6379 } },
);
