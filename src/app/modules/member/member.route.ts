import { Router } from 'express';
import { memberController } from './member.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import requireSubscription from '../../middleware/permission';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.user),
  requireSubscription(),
  memberController.createMember,
);
// router.patch('/:id', auth(USER_ROLE.user), memberController.updateMember);
router.delete(
  '/:id',
  auth(USER_ROLE.user),
  requireSubscription(),
  memberController.deleteMember,
);
router.get(
  '/:id',
  auth(USER_ROLE.user),
  requireSubscription(),
  memberController.getMemberById,
);
router.get(
  '/',
  auth(USER_ROLE.user),
  requireSubscription(),
  memberController.getMyMembers,
);

export const memberRoutes = router;
