import { createClient } from 'redis';
import colors from 'colors';
import { Queue } from 'bullmq';
import config from '../config';

const redisHost = config.redis_host || 'project_format_redis';
const redisPort = parseInt(config.redis_port || '6379');
const redisUrl = `redis://${redisHost}:${redisPort}`;

const pubClient = createClient({
  url: redisUrl,
  password: config.redis_password as string,
});
const subClient = pubClient.duplicate({
  password: config.redis_password as string,
});

const connection = {
  host: redisHost,
  port: redisPort,
  password: config.redis_password as string,
};

const connectRedis = async () => {
  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log(colors.blue.bold('✨ Connected to Redis server'));
};

const eventQueue = new Queue('event_notification', { connection });
// const eventQueue = new Queue('event_notification', {
//   connection: {
//     host: 'localhost',
//     port: 6379,
//   },
// });

const notificationQueue = new Queue('general_notification', { connection });
// const notificationQueue = new Queue('general_notification', {
//   connection: { host: 'localhost', port: 6379 },
// });

export {
  pubClient,
  subClient,
  connectRedis,
  eventQueue,
  notificationQueue,
  connection,
};
