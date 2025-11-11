import { Router } from 'express';
import { subscriptionController } from './subscription.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.user),
  subscriptionController.createSubscription,
);

// router.patch(
//   '/:id',
//   auth(USER_ROLE.user),
//   subscriptionController.updateSubscription,
// );

// router.delete(
//   '/:id',
//   auth(USER_ROLE.user),
//   subscriptionController.deleteSubscription,
// );

router.get(
  '/user/:userId',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  subscriptionController.getSubscriptionByUserId,
);
router.get(
  '/my-subscriptions',
  auth(USER_ROLE.user),
  subscriptionController.getMySubscription,
);
router.get(
  '/:id',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
  ),
  subscriptionController.getSubscriptionById,
);
// router.get('/', subscriptionController.getAllSubscription);

export const subscriptionRoutes = router;
