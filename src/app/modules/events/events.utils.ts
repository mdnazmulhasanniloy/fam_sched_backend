import moment from 'moment-timezone';

// ✅ Calculate reminder time (UTC safe)
// export const calculateReminderTime = (
//   startDate: Date,
//   value: number,
//   unit: string,
// ) => {
//   if (!value || !unit) return null;

//   const msMap: Record<string, number> = {
//     s: 1000,
//     m: 60 * 1000,
//     h: 60 * 60 * 1000,
//     d: 24 * 60 * 60 * 1000,
//     w: 7 * 24 * 60 * 60 * 1000,
//   };

//   const startUtc = moment.utc(startDate).valueOf();
//   const diff = value * msMap[unit];

//   return new Date(startUtc - diff);
// };

export const calculateReminderTime = (
  startDate: Date,
  value: number,
  unit: string,
  timezone: string,
) => {
  if (!value || !unit) return null;

  const unitMap: Record<string, any> = {
    s: 'seconds',
    m: 'minutes',
    h: 'hours',
    d: 'days',
    w: 'weeks',
  };

  return moment
    .tz(startDate, timezone) // 🔥 original timezone
    .subtract(value, unitMap[unit])
    .utc() // convert back to UTC
    .toDate();
};

// ✅ Generate recurring dates (UTC safe)
export const generateRecurringDates = (
  start: Date,
  end: Date,
  recurring: 'daily' | 'weekly' | 'monthly' | 'none',
  timezone: string,
) => {
  const dates: Date[] = [];

  let current = moment.tz(start, timezone);
  const endDate = moment.tz(end, timezone);

  while (current.isSameOrBefore(endDate)) {
    dates.push(current.toDate());

    if (recurring === 'daily') current = current.add(1, 'day');
    else if (recurring === 'weekly') current = current.add(1, 'week');
    else if (recurring === 'monthly') current = current.add(1, 'month');
    else break;
  }

  return dates;
};

export const convertToUserTZ = (date: Date, tz: string) => {
  return moment.utc(date).tz(tz).format();
};

export const convertEventToUserTZ = (event: any, timezone: string) => {
  return {
    ...event,
    startEvent: moment.utc(event.startEvent).tz(timezone).format(),
    endEvent: moment.utc(event.endEvent).tz(timezone).format(),
  };
};
