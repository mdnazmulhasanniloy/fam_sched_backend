import moment from 'moment-timezone';
import { reminderQueue } from '../redis';
import { IEvents } from '../modules/events/events.interface';

export const scheduleReminder = async (event: IEvents & { _id: any }) => {
  const tz = 'Asia/Dhaka';
  const repeatJobName = `repeat-${event._id}`;
  const singleJobId = `event-${event._id}`;

  // Remove old one-time jobs
  const jobs = await reminderQueue.getJobs(['delayed', 'wait', 'active']);
  for (const job of jobs) if (job.id === singleJobId) await job.remove();

  // Remove old repeatable jobs
  const repeatableJobs = await reminderQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    const rJob = job as any;
    if (rJob.name === repeatJobName) {
      await reminderQueue.removeRepeatable(rJob.name, {
        cron: rJob.cron,
        tz: rJob.tz,
      } as any);
    }
  }

  if (event.isDeleted) return;

  const reminder = event.remainder;
  const baseTime = moment(event.date).tz(tz);
  const triggerTime = baseTime
    .clone()
    .subtract(reminder.value, reminder.unit as any);

  // One-time
  if (!event.recurring || event.recurring === 'none') {
    const delay = triggerTime.diff(moment());
    await reminderQueue.add(
      'event-reminder',
      {
        eventId: event._id.toString(),
        user: event.assignTo,
        includeInSchedule: event.includeInSchedule,
        title: event.title,
        note: event.note,
      },
      {
        jobId: singleJobId,
        delay: delay > 0 ? delay : 0,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    return;
  }

  // Recurring
  const hh = triggerTime.hour();
  const mm = triggerTime.minute();
  let cron = '';

  if (event.recurring === 'daily') cron = `${mm} ${hh} * * *`;
  else if (event.recurring === 'weekly')
    cron = `${mm} ${hh} * * ${triggerTime.day()}`;
  else if (event.recurring === 'monthly')
    cron = `${mm} ${hh} ${triggerTime.date()} * *`;

  await reminderQueue.add(
    repeatJobName,
    {
      eventId: event._id.toString(),
      user: event.assignTo,
      includeInSchedule: event.includeInSchedule,
      title: event.title,
      note: event.note,
    },
    { repeat: { cron, tz } as any, removeOnComplete: true, removeOnFail: true },
  );
};
