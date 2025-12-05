import Events from '../events/events.models';
import { Types } from 'mongoose';
import now from '../../utils/now';
import moment from 'moment';

const calendarData = async (query: Record<string, any>) => {
  const { user, month, year } = query;
  const startOfMonth =
    year && month
      ? now(
          moment()
            .year(year)
            .month(month - 1),
        )
          .startOf('month')
          .toDate()
      : now().startOf('month').toDate();

  const endOfMonth =
    year && month
      ? now(
          moment()
            .year(year)
            .month(month - 1),
        )
          .endOf('month')
          .toDate()
      : now().endOf('month').toDate();

  const calendarData = await Events.aggregate([
    {
      $match: {
        user: new Types.ObjectId(user),
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: false,
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        date: 1,
        assignTo: 1,
        remainder: 1,
        recurring: 1,
        note: 1,
      },
    },
    {
      $addFields: {
        recurringDate: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$recurring', 'daily'] },
                then: {
                  $dateAdd: { startDate: '$date', unit: 'day', amount: 1 },
                },
              },
              {
                case: { $eq: ['$recurring', 'weekly'] },
                then: {
                  // If 'weekly', find all dates for the same day of the week within the month
                  $let: {
                    vars: {
                      startDate: '$date',
                      currentDay: { $dayOfWeek: '$date' }, // Get the day of the week (0-6, Sun-Sat)
                    },
                    in: {
                      $map: {
                        input: { $range: [0, 5] }, // Loop through the 4 weeks in the month (0, 1, 2, 3, 4)
                        as: 'week',
                        in: {
                          $dateAdd: {
                            startDate: {
                              $dateFromParts: {
                                year: { $year: '$date' },
                                month: { $month: '$date' },
                                day: {
                                  $subtract: [
                                    { $dayOfMonth: '$date' },
                                    { $mod: [{ $dayOfWeek: '$date' }, 7] },
                                  ],
                                }, // Find the start day of the week
                              },
                            },
                            unit: 'week',
                            amount: '$$week', // Add weeks (0 to 4)
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                case: { $eq: ['$recurring', 'monthly'] },
                then: {
                  $dateAdd: { startDate: '$date', unit: 'month', amount: 1 },
                },
              },
              {
                case: { $eq: ['$recurring', 'off'] },
                then: '$date',
              },
            ],
            default: '$date',
          },
        },
      },
    },
    {
      $unwind: '$recurringDate', // Flatten the array of recurring dates
    },
    {
      $group: {
        _id: {
          year: { $year: '$recurringDate' },
          month: { $month: '$recurringDate' },
          day: { $dayOfMonth: '$recurringDate' },
        },
        events: {
          $push: {
            _id: '$_id',
            title: '$title',
            date: '$date',
            assignTo: '$assignTo',
            remainder: '$remainder',
            recurring: '$recurring',
            note: '$note',
          },
        },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
        },
        events: 1,
        _id: 0,
      },
    },
  ]);

  return calendarData;
};
const WorkerCalendarData = async (query: Record<string, any>) => {
  const { user, month, year } = query;
  const startOfMonth =
    year && month
      ? now(
          moment()
            .year(year)
            .month(month - 1),
        )
          .startOf('month')
          .toDate()
      : now().startOf('month').toDate();

  const endOfMonth =
    year && month
      ? now(
          moment()
            .year(year)
            .month(month - 1),
        )
          .endOf('month')
          .toDate()
      : now().endOf('month').toDate();

  const calendarData = await Events.aggregate([
    {
      $match: {
        assignTo: new Types.ObjectId(user),
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: false,
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        date: 1,
        assignTo: 1,
        remainder: 1,
        recurring: 1,
        note: 1,
      },
    },
    {
      $addFields: {
        recurringDate: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$recurring', 'daily'] },
                then: {
                  $dateAdd: { startDate: '$date', unit: 'day', amount: 1 },
                },
              },
              {
                case: { $eq: ['$recurring', 'weekly'] },
                then: {
                  // If 'weekly', find all dates for the same day of the week within the month
                  $let: {
                    vars: {
                      startDate: '$date',
                      currentDay: { $dayOfWeek: '$date' }, // Get the day of the week (0-6, Sun-Sat)
                    },
                    in: {
                      $map: {
                        input: { $range: [0, 5] }, // Loop through the 4 weeks in the month (0, 1, 2, 3, 4)
                        as: 'week',
                        in: {
                          $dateAdd: {
                            startDate: {
                              $dateFromParts: {
                                year: { $year: '$date' },
                                month: { $month: '$date' },
                                day: {
                                  $subtract: [
                                    { $dayOfMonth: '$date' },
                                    { $mod: [{ $dayOfWeek: '$date' }, 7] },
                                  ],
                                }, // Find the start day of the week
                              },
                            },
                            unit: 'week',
                            amount: '$$week', // Add weeks (0 to 4)
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                case: { $eq: ['$recurring', 'monthly'] },
                then: {
                  $dateAdd: { startDate: '$date', unit: 'month', amount: 1 },
                },
              },
              {
                case: { $eq: ['$recurring', 'off'] },
                then: '$date',
              },
            ],
            default: '$date',
          },
        },
      },
    },
    {
      $unwind: '$recurringDate', // Flatten the array of recurring dates
    },
    {
      $group: {
        _id: {
          year: { $year: '$recurringDate' },
          month: { $month: '$recurringDate' },
          day: { $dayOfMonth: '$recurringDate' },
        },
        events: {
          $push: {
            _id: '$_id',
            title: '$title',
            date: '$date',
            assignTo: '$assignTo',
            remainder: '$remainder',
            recurring: '$recurring',
            note: '$note',
          },
        },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
        },
        events: 1,
        _id: 0,
      },
    },
  ]);

  return calendarData;
};

export const homepageDataService = {
  calendarData,
  WorkerCalendarData,
};
