import Subscription from '../modules/subscription/subscription.models';
import catchAsync from '../utils/catchAsync';

const permission = () => {
  return catchAsync(async (req, res, next) => {
    const userId = req?.user?.userId;

    if (!userId) {
      throw new Error('Unauthorized Access');
    }

    //check subscription
    const subscription = await Subscription.findOne({
      user: userId,
      isExpired: false,
      isPaid: true,
    });

    next();
  });
};
export default permission;
