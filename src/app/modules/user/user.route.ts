import { Router } from 'express';
import { userController } from './user.controller';
import validateRequest from '../../middleware/validateRequest';
import { userValidation } from './user.validation';
import auth from '../../middleware/auth';
import { USER_ROLE } from './user.constants';
import parseData from '../../middleware/parseData';
import multer, { memoryStorage } from 'multer';

const router = Router();
const upload = multer({ storage: memoryStorage() });

router.post(
  '/',
  upload.single('profile'),
  parseData(),
  validateRequest(userValidation?.guestValidationSchema),
  userController.createUser,
);

router.post('/invite-worker', userController.createWorker);

router.patch(
  '/update-my-profile', 
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.worker,
  ),
  upload.single('profile'),
  parseData(),
  userController.updateMyProfile,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  upload.single('profile'),
  parseData(),
  userController.updateUser,
);

router.delete(
  '/delete-my-account',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.worker,
  ),
  userController.deleteMYAccount,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  userController.deleteUser,
);

router.get(
  '/my-profile',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.user,
    USER_ROLE.worker,
  ),
  userController.getMyProfile,
);

router.get('/:id', userController.getUserById);

router.get(
  '/',
  // auth(USER_ROLE.admin),
  userController.getAllUser,
);

export const userRoutes = router;
