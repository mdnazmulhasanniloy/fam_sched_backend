import { Router } from 'express';
import { packageController } from './package.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  packageController.createPackage,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  auth(USER_ROLE.admin),
  packageController.updatePackage,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  packageController.deletePackage,
);
router.get('/:id', packageController.getPackageById);
router.get('/', packageController.getAllPackage);

export const packageRoutes = router;
