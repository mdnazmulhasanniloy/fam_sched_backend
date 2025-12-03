import moment from 'moment';
import Payments from '../payments/payments.models';
import Subscription from '../subscription/subscription.models';
import { User } from '../user/user.models';
import { initializeMonthlyData } from './dashboard.utils';
import { MonthlyIncome, MonthlyUsers } from './dashboard.interface';
import { PAYMENT_STATUS } from '../payments/payments.constants';
import pickQuery from '../../utils/pickQuery';
import { Types } from 'mongoose';
import { paginationHelper } from '../../helpers/pagination.helpers';

const getTopCards = async (query: Record<string, any>) => {
  const totalEarnings = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  const totalUsers = await User.countDocuments({
    isDeleted: false,
    role: { $ne: 'admin' },
  });

  const activeSubscriptions = await Subscription.countDocuments({
    isDeleted: false,
    isPaid: true,
    isExpired: false,
    expiredAt: { $gt: new Date() },
  });

  const lastRegisteredUser = await User.find({
    isDeleted: false,
    role: { $ne: 'admin' },
  })
    .sort({ createdAt: -1 })
    .limit(15)
    .select(
      '-password -verification -device -expireAt -isDeleted -passwordChangedAt -needsPasswordChange -loginWth -customerId',
    );

  return {
    totalEarnings: totalEarnings[0]?.totalAmount || 0,
    totalUsers,
    activeSubscriptions,
    lastRegisteredUser,
  };
};

const dashboardChart = async (query: Record<string, any>) => {
  const incomeYear = query.incomeYear || moment().utc().year();
  const joinYear = query.joinYear || moment().utc().year();

  const incomeData = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
        createdAt: {
          $gte: moment().year(incomeYear).startOf('year').toDate(),
          $lte: moment().year(incomeYear).endOf('year').toDate(),
        },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        income: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);
  //.then(data => data[0]);

  const monthlyIncome = initializeMonthlyData('income') as MonthlyIncome[];
  incomeData?.forEach(
    ({ _id, income }: { _id: { month: number }; income: number }) => {
      monthlyIncome[_id.month - 1].income = Math.round(income);
    },
  );

  const usersData = await User.aggregate([
    {
      $match: {
        isDeleted: false,
        role: { $ne: 'admin' },
        'verification.status': true,
        createdAt: {
          $gte: moment().utc().year(joinYear).startOf('year').toDate(),
          $lte: moment().utc().year(joinYear).endOf('year').toDate(),
        },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        total: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);
  //.then(data => data[0]);

  const monthlyUsers = initializeMonthlyData('total') as MonthlyUsers[];
  usersData.forEach(
    ({ _id, total }: { _id: { month: number }; total: number }) => {
      monthlyUsers[_id.month - 1].total = Math.round(total);
    },
  );

  return {
    monthlyIncome,
    monthlyUsers,
  };
};

const getAllTransitions = async (query: Record<string, any>) => {
  const today = moment().startOf('day');

  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;

  if (filtersData.user) {
    filtersData['user'] = new Types.ObjectId(filtersData.user);
  }

  const pipeline: any[] = [];
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['tnxId', 'cardLast4', 'status'].map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  if (Object.entries(filtersData).length) {
    Object.entries(filtersData).forEach(([field, value]) => {
      if (/^\[.*?\]$/.test(value)) {
        const match = value.match(/\[(.*?)\]/);
        const queryValue = match ? match[1] : value;
        pipeline.push({
          $match: {
            [field]: { $in: [new Types.ObjectId(queryValue)] },
          },
        });
        delete filtersData[field];
      } else {
        if (!isNaN(value)) {
          filtersData[field] = Number(value);
        }
      }
    });

    if (Object.entries(filtersData).length) {
      pipeline.push({
        $match: {
          $and: Object.entries(filtersData).map(([field, value]) => ({
            isDeleted: false,
            [field]: value,
          })),
        },
      });
    }
  }
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  if (sort) {
    const sortArray = sort.split(',').map(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        return { [trimmedField.slice(1)]: -1 };
      }
      return { [trimmedField]: 1 };
    });

    pipeline.push({ $sort: Object.assign({}, ...sortArray) });
  }

  pipeline.push({
    $facet: {
      totalData: [{ $count: 'total' }],
      paginatedData: [
        { $skip: skip },
        { $limit: limit },
        // Lookups
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phoneNumber: 1,
                  profile: 1,
                },
              },
            ],
          },
        },

        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
          },
        },
      ],
    },
  });

  const [result] = await Payments.aggregate(pipeline);
  const total = result?.totalData?.[0]?.total || 0;
  const data = result?.paginatedData || [];
  const transactions = {
    meta: { page, limit, total },
    data,
  };

  const earnings = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
      },
    },
    {
      $facet: {
        totalEarnings: [
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
          {
            $project: {
              total: { $ifNull: ['$total', 0] },
            },
          },
        ],
        todayEarnings: [
          {
            $match: {
              status: PAYMENT_STATUS.paid,
              createdAt: {
                $gte: today.startOf('day').toDate(),
                $lte: today.endOf('day').toDate(),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
          {
            $project: {
              total: { $ifNull: ['$total', 0] }, // If no data, default to 0
            },
          },
        ],
      },
    },
    {
      $project: {
        totalEarnings: {
          $ifNull: [{ $arrayElemAt: ['$totalEarnings.total', 0] }, 0],
        }, // Ensure default 0 if empty
        todayEarnings: {
          $ifNull: [{ $arrayElemAt: ['$todayEarnings.total', 0] }, 0],
        }, // Ensure default 0 if empty
      },
    },
  ]).then(data => data[0]);
  const totalSubscriptions = await Subscription.countDocuments({
    isPaid: true,
    isDeleted: false,
  });

  return {
    transactions,
    earnings,
    totalSubscriptions,
  };
};

export const dashboardService = {
  getTopCards,
  dashboardChart,
  getAllTransitions,
};
