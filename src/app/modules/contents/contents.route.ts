import { Router } from 'express';
import { contentsController } from './contents.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants'; 

const router = Router(); 

router.post(
  '/',
  auth(USER_ROLE.super_admin, USER_ROLE.sub_admin, USER_ROLE.admin), 
  contentsController.createContents,
);

router.put(
  '/',
  auth(USER_ROLE.super_admin, USER_ROLE.sub_admin, USER_ROLE.admin), 
  contentsController.updateContents,
);
 

router.get('/:id', contentsController.getContentsById);

router.get('/', contentsController.getAllContents);

export const contentsRoutes = router;
