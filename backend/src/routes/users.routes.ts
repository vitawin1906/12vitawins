// backend/src/routes/users.routes.ts
import { Router } from 'express';
import { usersController } from '../controllers/usersController';

const router = Router();

/* ───────────────── User Profile Routes ───────────────── */
router.get('/me', ...usersController.getMyProfile);
router.put('/me', ...usersController.updateMyProfile);
router.get('/me/stats', ...usersController.getMyStats);
router.post('/me/change-password', ...usersController.changePassword);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminUsersRouter = Router();

adminUsersRouter.get('/', ...usersController.listUsers);
adminUsersRouter.get('/:id', ...usersController.getUserById);
adminUsersRouter.put('/:id', ...usersController.updateUser);
adminUsersRouter.post('/:id/upgrade-to-partner', ...usersController.upgradeToPartner);
adminUsersRouter.post('/:id/lock-referrer', ...usersController.lockReferrer);
