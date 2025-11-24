import moment from 'moment';
import Payments from '../payments/payments.models';
import Subscription from '../subscription/subscription.models';
import { User } from '../user/user.models';
import { initializeMonthlyData } from './dashboard.utils';
import { MonthlyIncome, MonthlyUsers } from './dashboard.interface';
import { PAYMENT_STATUS } from '../payments/payments.constants';

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

export const dashboardService = {
  getTopCards,
  dashboardChart,
};
