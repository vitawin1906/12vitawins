// backend/src/routes/settings.routes.ts
import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';

const router = Router();

/* ───────────────── Public Routes ───────────────── */
router.get('/:key', ...settingsController.getActiveValue);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminSettingsRouter = Router();

adminSettingsRouter.get('/keys', ...settingsController.listSettingKeys);
adminSettingsRouter.get('/:key', ...settingsController.getAdminActiveValue);
adminSettingsRouter.post('/', ...settingsController.insertVersion);
adminSettingsRouter.post('/ensure-defaults', ...settingsController.ensureDefaults);
adminSettingsRouter.post('/invalidate-cache', ...settingsController.invalidateCache);
