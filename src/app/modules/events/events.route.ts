import { Router } from 'express';
import { eventsController } from './events.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import validateRequest from '../../middleware/validateRequest';
import { eventsValidation } from './events.validation';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.worker),
  // requireSubscription(),
  eventsController.createEvents,
);
router.patch(
  '/:id/respond',
  auth(USER_ROLE.user, USER_ROLE.worker),
  validateRequest(eventsValidation.respondToAssignmentSchema),
  eventsController.respondToAssignment,
);
router.patch(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.worker),
  // requireSubscription(),
  eventsController.updateEvents,
);
router.delete(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.worker),
  // requireSubscription(),
  eventsController.deleteEvents,
);

router.get(
  '/:id',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.worker,
  ),
  eventsController.getEventsById,
);
router.get(
  '/',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.worker,
  ),
  eventsController.getAllEvents,
);

export const eventsRoutes = router;
