
import { Router } from 'express';
import { eventsController } from './events.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post('/', auth(USER_ROLE.user), eventsController.createEvents);
router.patch('/:id', eventsController.updateEvents);
router.delete('/:id', eventsController.deleteEvents);
router.get('/:id', eventsController.getEventsById);
router.get('/', eventsController.getAllEvents);

export const eventsRoutes = router;