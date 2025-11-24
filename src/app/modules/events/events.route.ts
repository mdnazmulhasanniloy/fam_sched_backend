import { Router } from 'express';
import { eventsController } from './events.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import requireSubscription from '../../middleware/permission';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.user),
  requireSubscription(),
  eventsController.createEvents,
);
router.patch(
  '/:id',
  auth(USER_ROLE.user),
  requireSubscription(),
  eventsController.updateEvents,
);
router.delete(
  '/:id',
  auth(USER_ROLE.user),
  requireSubscription(),
  eventsController.deleteEvents,
);


router.get('/:id', eventsController.getEventsById);
router.get('/', eventsController.getAllEvents);

export const eventsRoutes = router;
