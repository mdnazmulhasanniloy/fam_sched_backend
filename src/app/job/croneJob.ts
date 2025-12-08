import { messageFlushQueue, notificationFlushQueue } from '../redis';

setInterval(async () => {
  await messageFlushQueue.add('flush_messages', {}, { removeOnComplete: true });
}, 10_000);

setInterval(async () => {
  await notificationFlushQueue.add(
    'flush_notifications',
    {},
    { removeOnComplete: true },
  );
}, 30_000);
