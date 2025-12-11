import { createClient } from 'redis';
import colors from 'colors';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

const connectRedis = async () => {
  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log(colors.blue.bold('✨ Connected to Redis server'));
};

const eventQueue = new Queue('event_notification', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

const notificationQueue = new Queue('general_notification', {
  connection: { host: 'localhost', port: 6379 },
});

export { pubClient, subClient, connectRedis, eventQueue, notificationQueue };
