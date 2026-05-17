import Events from '../events/events.models';
import { Types } from 'mongoose';
import moment from 'moment';

const calendarData = async (query: Record<string, any>) => {
  const { user, month, year } = query;

  const startOfMonth =
    year && month
      ? moment()
          .year(year)
          .month(month - 1)
          .startOf('month')
      : moment().startOf('month');

  const endOfMonth =
    year && month
      ? moment()
          .year(year)
          .month(month - 1)
          .endOf('month')
      : moment().endOf('month');

  // 1️⃣ MongoDB থেকে raw events
  const events = await Events.find({
    isDeleted: false,
    $or: [
      { user: new Types.ObjectId(user) },
      { includeInSchedule: new Types.ObjectId(user) },
    ],
    startEvent: { $lte: endOfMonth.toDate() },
    endEvent: { $gte: startOfMonth.toDate() },
  }).lean();

  // 2️⃣ Calendar map
  const calendarMap: Record<string, any[]> = {};

  // 3️⃣ Recurring expand logic
  for (const event of events) {
    let current = moment(event.startEvent);

    while (current.isSameOrBefore(event.endEvent)) {
      if (
        current.isSameOrAfter(startOfMonth) &&
        current.isSameOrBefore(endOfMonth)
      ) {
        const dateKey = current.format('YYYY-MM-DD');

        if (!calendarMap[dateKey]) {
          calendarMap[dateKey] = [];
        }

        calendarMap[dateKey].push({
          _id: event._id,
          title: event.title,
          startEvent: event.startEvent,
          endEvent: event.endEvent,
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
  const { user, month, year } = query;

  const startOfMonth =
    year && month
      ? moment()
          .year(year)
          .month(month - 1)
          .startOf('month')
      : moment().startOf('month');

  const endOfMonth =
    year && month
      ? moment()
          .year(year)
          .month(month - 1)
          .endOf('month')
      : moment().endOf('month');

  const userId = new Types.ObjectId(user);

  const events = await Events.find({
    isDeleted: false,
    $or: [
      { user: userId },
      { assignTo: userId },
      { includeInSchedule: { $in: [userId] } },
    ],
    startEvent: { $lte: endOfMonth.toDate() },
    endEvent: { $gte: startOfMonth.toDate() },
  }).lean();

  const calendarMap: Record<string, any[]> = {};

  for (const event of events) {
    let current = moment(event.startEvent);

    while (current.isSameOrBefore(event.endEvent)) {
      if (
        current.isSameOrAfter(startOfMonth) &&
        current.isSameOrBefore(endOfMonth)
      ) {
        const dateKey = current.format('YYYY-MM-DD');

        if (!calendarMap[dateKey]) {
          calendarMap[dateKey] = [];
        }

        calendarMap[dateKey].push({
          _id: event._id,
          title: event.title,
          startEvent: event.startEvent,
          endEvent: event.endEvent,
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
