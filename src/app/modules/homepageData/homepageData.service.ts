import Events from '../events/events.models';
import { Types } from 'mongoose';
import now from '../../utils/now';
import moment from 'moment';

// const calendarData = async (query: Record<string, any>) => {
//   const { user, month, year } = query;

//   const startOfMonth =
//     year && month
//       ? now(
//           moment()
//             .year(year)
//             .month(month - 1),
//         )
//           .startOf('month')
//           .toDate()
//       : now().startOf('month').toDate();

//   const endOfMonth =
//     year && month
//       ? now(
//           moment()
//             .year(year)
//             .month(month - 1),
//         )
//           .endOf('month')
//           .toDate()
//       : now().endOf('month').toDate();

//   const data = await Events.aggregate([
//     {
//       $match: {
//         isDeleted: false,
//         $or: [
//           {
//             user: new Types.ObjectId(user),
//           },
//           {
//             includeInSchedule: { $all: [new Types.ObjectId(user)] },
//           },
//         ],
//       },
//     },
//     {
//       $match: {
//         // IMPORTANT: event overlaps with month range
//         $or: [
//           {
//             startEvent: { $lte: endOfMonth },
//             endEvent: { $gte: startOfMonth },
//           },
//         ],
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         title: 1,
//         startEvent: 1,
//         endEvent: 1,
//         assignTo: 1,
//         remainder1: 1,
//         remainder2: 1,
//         remainder3: 1,
//         recurring: 1,
//         note: 1,
//       },
//     },

//     // Recurring Logic Adjusted for startEvent instead of date
//     {
//       $addFields: {
//         recurringDate: {
//           $switch: {
//             branches: [
//               {
//                 case: { $eq: ['$recurring', 'daily'] },
//                 then: {
//                   $dateAdd: {
//                     startDate: '$startEvent',
//                     unit: 'day',
//                     amount: 1,
//                   },
//                 },
//               },
//               {
//                 case: { $eq: ['$recurring', 'weekly'] },
//                 then: {
//                   $dateAdd: {
//                     startDate: '$startEvent',
//                     unit: 'week',
//                     amount: 1,
//                   },
//                 },
//               },
//               {
//                 case: { $eq: ['$recurring', 'monthly'] },
//                 then: {
//                   $dateAdd: {
//                     startDate: '$startEvent',
//                     unit: 'month',
//                     amount: 1,
//                   },
//                 },
//               },
//               {
//                 case: { $eq: ['$recurring', 'off'] },
//                 then: '$startEvent',
//               },
//             ],
//             default: '$startEvent',
//           },
//         },
//       },
//     },

//     {
//       $group: {
//         _id: {
//           year: { $year: '$startEvent' },
//           month: { $month: '$startEvent' },
//           day: { $dayOfMonth: '$startEvent' },
//         },
//         events: {
//           $push: {
//             _id: '$_id',
//             title: '$title',
//             startEvent: '$startEvent',
//             endEvent: '$endEvent',
//             assignTo: '$assignTo',
//             remainder1: '$remainder1',
//             remainder2: '$remainder2',
//             remainder3: '$remainder3',
//             recurring: '$recurring',
//             note: '$note',
//           },
//         },
//       },
//     },

//     {
//       $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
//     },

//     {
//       $project: {
//         date: {
//           $dateFromParts: {
//             year: '$_id.year',
//             month: '$_id.month',
//             day: '$_id.day',
//           },
//         },
//         events: 1,
//         _id: 0,
//       },
//     },
//   ]);

//   return data;
// };

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

  const events = await Events.find({
    isDeleted: false,
    $or: [
      { assignTo: new Types.ObjectId(user) },
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

  // const data = await Events.aggregate([
  //   {
  //     $match: {
  //       isDeleted: false,
  //       $or: [
  //         {
  //           assignTo: new Types.ObjectId(user),
  //         },
  //         {
  //           includeInSchedule: { $all: [new Types.ObjectId(user)] },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $match: {
  //       // IMPORTANT: event overlaps with month range
  //       $or: [
  //         {
  //           startEvent: { $lte: endOfMonth },
  //           endEvent: { $gte: startOfMonth },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $project: {
  //       _id: 1,
  //       title: 1,
  //       startEvent: 1,
  //       endEvent: 1,
  //       assignTo: 1,
  //       remainder1: 1,
  //       remainder2: 1,
  //       remainder3: 1,
  //       recurring: 1,
  //       note: 1,
  //     },
  //   },

  //   // Recurring Logic Adjusted for startEvent instead of date
  //   {
  //     $addFields: {
  //       recurringDate: {
  //         $switch: {
  //           branches: [
  //             {
  //               case: { $eq: ['$recurring', 'daily'] },
  //               then: {
  //                 $dateAdd: {
  //                   startDate: '$startEvent',
  //                   unit: 'day',
  //                   amount: 1,
  //                 },
  //               },
  //             },
  //             {
  //               case: { $eq: ['$recurring', 'weekly'] },
  //               then: {
  //                 $dateAdd: {
  //                   startDate: '$startEvent',
  //                   unit: 'week',
  //                   amount: 1,
  //                 },
  //               },
  //             },
  //             {
  //               case: { $eq: ['$recurring', 'monthly'] },
  //               then: {
  //                 $dateAdd: {
  //                   startDate: '$startEvent',
  //                   unit: 'month',
  //                   amount: 1,
  //                 },
  //               },
  //             },
  //             {
  //               case: { $eq: ['$recurring', 'off'] },
  //               then: '$startEvent',
  //             },
  //           ],
  //           default: '$startEvent',
  //         },
  //       },
  //     },
  //   },

  //   {
  //     $group: {
  //       _id: {
  //         year: { $year: '$startEvent' },
  //         month: { $month: '$startEvent' },
  //         day: { $dayOfMonth: '$startEvent' },
  //       },
  //       events: {
  //         $push: {
  //           _id: '$_id',
  //           title: '$title',
  //           startEvent: '$startEvent',
  //           endEvent: '$endEvent',
  //           assignTo: '$assignTo',
  //           remainder1: '$remainder1',
  //           remainder2: '$remainder2',
  //           remainder3: '$remainder3',
  //           recurring: '$recurring',
  //           note: '$note',
  //         },
  //       },
  //     },
  //   },

  //   {
  //     $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
  //   },

  //   {
  //     $project: {
  //       date: {
  //         $dateFromParts: {
  //           year: '$_id.year',
  //           month: '$_id.month',
  //           day: '$_id.day',
  //         },
  //       },
  //       events: 1,
  //       _id: 0,
  //     },
  //   },
  // ]);

  // return data;
};

export const homepageDataService = {
  calendarData,
  WorkerCalendarData,
};
