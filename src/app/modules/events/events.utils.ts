import moment from 'moment';

export const calculateReminderTime = (
  startDate: Date,
  value: number,
  unit: string,
) => {
  if (!value || !unit) return null;

  const msMap: any = {
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 7 * 86400000,
  };

  const diff = value * msMap[unit];
  return new Date(moment(startDate).valueOf() - diff);
};

export const generateRecurringDates = (
  start: Date,
  end: Date,
  recurring: 'daily' | 'weekly' | 'monthly' | 'off',
) => {
  const dates: Date[] = [];
  let current = moment(start);

  while (current.toDate() <= end) {
    dates.push(current.toDate());

    if (recurring === 'daily') current = current.add(1, 'day');
    else if (recurring === 'weekly') current = current.add(1, 'week');
    else if (recurring === 'monthly') current = current.add(1, 'month');
    else break; // off
  }

  return dates;
};
