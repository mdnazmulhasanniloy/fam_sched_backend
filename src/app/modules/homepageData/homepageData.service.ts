import Events from '../events/events.models';
import { Types } from 'mongoose';
import moment from 'moment-timezone';
import { User } from '../user/user.models';

const calendarData = async (query: Record<string, any>) => {
  const { user, month, year } = query;
  const timezone = await User.findById(user)
    .select('timezone')
    .then(user => user?.timezone || 'UTC'); 
  const startOfMonth = moment
    .tz({ year, month: month - 1 }, timezone)
    .startOf('month');

  const endOfMonth = moment
    .tz({ year, month: month - 1 }, timezone)
    .endOf('month');

  // 1️⃣ MongoDB থেকে raw events
  const events = await Events.find({
    isDeleted: false,
    $or: [
      { user: new Types.ObjectId(user) },
      { includeInSchedule: new Types.ObjectId(user) },
    ],
    startEvent: { $lte: endOfMonth.clone().utc().toDate() },
    endEvent: { $gte: startOfMonth.clone().utc().toDate() },
  }).lean();

  // 2️⃣ Calendar map
  const calendarMap: Record<string, any[]> = {};

  // 3️⃣ Recurring expand logic
  for (const event of events) {
    // eslint-disable-next-line prefer-const
    let current = moment.utc(event.startEvent).tz(timezone);
    const end = moment.utc(event.endEvent).tz(timezone);
    while (current.isSameOrBefore(end)) {
      if (
        current.isSameOrAfter(startOfMonth) &&
        current.isSameOrBefore(endOfMonth)
      ) {
        const dateKey = query?.userTz
          ? moment.utc(current).tz(query.userTz).format('YYYY-MM-DD')
          : current.format('YYYY-MM-DD');

        if (!calendarMap[dateKey]) {
          calendarMap[dateKey] = [];
        }

        calendarMap[dateKey].push({
          _id: event._id,
          title: event.title,
          startEvent: moment.utc(event.startEvent).tz(timezone).format(),
          endEvent: moment.utc(event.endEvent).tz(timezone).format(),
          location: event.location,
          assignTo: event.assignTo,
          remainder1: event.remainder1,
          remainder2: event.remainder2,
          remainder3: event.remainder3,
          recurring: event.recurring,
          note: event.note,
        });
      }

      // recurring rule
      if (event.recurring === 'daily') {
        current.add(1, 'day');
      } else if (event.recurring === 'weekly') {
        current.add(1, 'week');
      } else if (event.recurring === 'monthly') {
        current.add(1, 'month');
      } else {
        break; // recurring = off
      }
    }
  }

  // 4️⃣ Final calendar array
  const result = Object.keys(calendarMap)
    .sort()
    .map(date => ({
      date: new Date(date),
      events: calendarMap[date],
    }));

  return result;
};

const WorkerCalendarData = async (query: Record<string, any>) => {
  const { user, month, year, timezone = 'UTC' } = query;

  const startOfMonth =
    year && month
      ? moment.tz({ year, month: month - 1 }, timezone).startOf('month')
      : moment.tz(timezone).startOf('month');

  const endOfMonth =
    year && month
      ? moment.tz({ year, month: month - 1 }, timezone).endOf('month')
      : moment.tz(timezone).endOf('month');

  const userId = new Types.ObjectId(user);

  const events = await Events.find({
    isDeleted: false,
    $or: [
      { user: userId },
      { assignTo: userId },
      { includeInSchedule: { $in: [userId] } },
    ],
    startEvent: { $lte: endOfMonth.clone().utc().toDate() },
    endEvent: { $gte: startOfMonth.clone().utc().toDate() },
  }).lean();

  const calendarMap: Record<string, any[]> = {};

  for (const event of events) {
    // eslint-disable-next-line prefer-const
    let current = moment.utc(event.startEvent).tz(timezone);
    const end = moment.utc(event.endEvent).tz(timezone);

    while (current.isSameOrBefore(end)) {
      if (
        current.isSameOrAfter(startOfMonth) &&
        current.isSameOrBefore(endOfMonth)
      ) {
        const dateKey = query?.userTz
          ? moment.utc(current).tz(query.userTz).format('YYYY-MM-DD')
          : current.format('YYYY-MM-DD');

        if (!calendarMap[dateKey]) {
          calendarMap[dateKey] = [];
        }

        calendarMap[dateKey].push({
          _id: event._id,
          title: event.title,
          startEvent: moment.utc(event.startEvent).tz(timezone).format(),
          endEvent: moment.utc(event.endEvent).tz(timezone).format(),
          location: event.location,
          assignTo: event.assignTo,
          remainder1: event.remainder1,
          remainder2: event.remainder2,
          remainder3: event.remainder3,
          recurring: event.recurring,
          note: event.note,
        });
      }

      if (event.recurring === 'daily') {
        current.add(1, 'day');
      } else if (event.recurring === 'weekly') {
        current.add(1, 'week');
      } else if (event.recurring === 'monthly') {
        current.add(1, 'month');
      } else {
        break;
      }
    }
  }

  return Object.keys(calendarMap)
    .sort()
    .map(date => ({
      date: new Date(date),
      events: calendarMap[date],
    }));
};

export const homepageDataService = {
  calendarData,
  WorkerCalendarData,
};
