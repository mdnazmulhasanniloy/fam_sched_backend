import { Router } from 'express';
import { homepageDataController } from './homepageData.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.get(
  '/user-calendar',
  auth(USER_ROLE.user),
  homepageDataController.calendarData,
);
router.get(
  '/worker-calendar',
  auth(USER_ROLE.worker),
  homepageDataController.calendarData,
);

export const homepageDataRoutes = router;
