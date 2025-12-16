// backend/src/routes/mlm.routes.ts
import { Router } from 'express';
import { mlmController } from '../controllers/mlmController';

const router = Router();

/* ───────────────── User MLM Routes ───────────────── */
router.get('/my-network', ...mlmController.getMyNetwork);
router.get('/my-network/tree', ...mlmController.getMyNetworkTree);
router.get('/my-upline', ...mlmController.getMyUpline);
router.get('/my-downline', ...mlmController.getMyDownline);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminMlmRouter = Router();

adminMlmRouter.get('/network/users', ...mlmController.getAllNetworkUsers);
adminMlmRouter.get('/network/user/:userId/tree', ...mlmController.getUserNetworkTree);
adminMlmRouter.post('/attach', ...mlmController.attachToNetwork);
adminMlmRouter.post('/move', ...mlmController.moveInNetwork);
adminMlmRouter.get('/orphans', ...mlmController.listOrphans);
