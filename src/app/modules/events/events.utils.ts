import moment from 'moment';

// ✅ Calculate reminder time (UTC safe)
export const calculateReminderTime = (
  startDate: Date,
  value: number,
  unit: string,
) => {
  if (!value || !unit) return null;

  const msMap: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  const startUtc = moment.utc(startDate).valueOf();
  const diff = value * msMap[unit];

  return new Date(startUtc - diff);
};

// ✅ Generate recurring dates (UTC safe)
export const generateRecurringDates = (
  start: Date,
  end: Date,
  recurring: 'daily' | 'weekly' | 'monthly' | 'none',
) => {
  const dates: Date[] = [];

  let current = moment.utc(start);
  const endDate = moment.utc(end);

  while (current.isSameOrBefore(endDate)) {
    dates.push(current.toDate());

    if (recurring === 'daily') current = current.add(1, 'day');
    else if (recurring === 'weekly') current = current.add(1, 'week');
    else if (recurring === 'monthly') current = current.add(1, 'month');
    else break;
  }

  return dates;
};
