import { Worker, Job } from 'bullmq';
import { notificationServices } from '../modules/notification/notification.service';

const notificationWorker = new Worker(
  'general_notification',
  async (job: Job) => {
    try {
      // 1️⃣ Save to DB
      await notificationServices.insertNotificationIntoDb(job.data);
    } catch (err) {
      console.error('Firebase notification failed:', err);
    }
  },
  { connection: { host: 'localhost', port: 6379 }, concurrency: 10 },
);

notificationWorker.on('failed', (job: any, err) => {
  console.error(`❌ Notification failed for ${job.data.receiver}:`, err);
});

console.log('⚡ Notification worker running...');
