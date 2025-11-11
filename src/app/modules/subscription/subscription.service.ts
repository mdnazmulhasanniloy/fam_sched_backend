import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { ISubscriptions } from './subscription.interface';
import Subscription from './subscription.models';
import { Types } from 'mongoose';
import Package from '../package/package.models';
import QueryBuilder from '../../core/builder/QueryBuilder';

const createSubscription = async (payload: ISubscriptions) => {
  const isExist = await Subscription.findOne({
    user: payload.user,
    package: payload.package,
    isPaid: false,
  });

  if (isExist) {
    return isExist;
  }

  const packages = await Package.findById(payload.package);

  if (!packages) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Package not found');
  }

  const result = await Subscription.create(payload);
  if (!result) {
    throw new Error('Failed to create subscription');
  }

  return result;
};

const getAllSubscription = async (query: Record<string, any>) => {
  const subscriptionsModel = new QueryBuilder(
    Subscription.find({ isDeleted: false }).populate([
      'package',
      { path: 'user', select: 'name email phoneNumber profile' },
    ]),
    query,
  )
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await subscriptionsModel.modelQuery;
  const meta = await subscriptionsModel.countTotal();
  return {
    data,
    meta,
  };
};

const getSubscriptionById = async (id: string) => {
  const result = await Subscription.findById(id).populate([
    'package',
    { path: 'user', select: 'name email phoneNumber profile' },
  ]);
  if (!result || result?.isDeleted) {
    throw new Error('Subscription not found');
  }
  return result;
};

const getSubscriptionByUserId = async (id: string) => {
  const result = await Subscription.findOne({
    user: new Types.ObjectId(id),
    isExpired: false,
    isPaid: true,
    isDeleted: false,
  }).populate([
    'package',
    { path: 'user', select: 'name email phoneNumber profile' },
  ]);

  return result;
};

const updateSubscription = async (
  id: string,
  payload: Partial<ISubscriptions>,
) => {
  const result = await Subscription.findByIdAndUpdate(id, payload, {
    new: true,
  });
  if (!result) {
    throw new Error('Failed to update subscription');
  }
  return result;
};

const deleteSubscription = async (id: string) => {
  const result = await Subscription.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new Error('Failed to delete subscription');
  }
  return result;
};

export const subscriptionService = {
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  getSubscriptionByUserId,
};
