import httpStatus from 'http-status';
import Subscription from '../modules/subscription/subscription.models';
import catchAsync from '../utils/catchAsync';
import AppError from '../error/AppError';
import moment from 'moment';

const requireSubscription = () => {
  return catchAsync(async (req, res, next) => {
    const userId = req?.user?.userId;

    if (!userId) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized Access');
    }

    const subscription = await Subscription.findOne({
      user: userId,
      isExpired: false,
      isPaid: true,
      expiredAt: { $gt: moment().utc().toDate() },
    });

    if (!subscription) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Your subscription has expired or is not active. Please subscribe to continue.',
      );
    }

    next();
  });
};

export default requireSubscription;
