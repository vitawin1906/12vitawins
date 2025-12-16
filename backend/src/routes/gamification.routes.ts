// backend/src/routes/gamification.routes.ts
import { Router } from 'express';
import { gamificationController } from '../controllers/gamificationController';

const router = Router();

/* ───────────────── Public Airdrop Routes ───────────────── */
router.get('/airdrop/tasks', ...gamificationController.listAirdropTasks);
router.get('/airdrop/tasks/:id', ...gamificationController.getAirdropTask);

/* ───────────────── User Airdrop Routes ───────────────── */
router.get('/airdrop/my-actions', ...gamificationController.getMyAirdropActions);
router.post('/airdrop/actions', ...gamificationController.upsertUserAirdropAction);

/* ───────────────── Public Achievements Routes ───────────────── */
router.get('/achievements', ...gamificationController.listAchievements);
router.get('/achievements/:id', ...gamificationController.getAchievement);

/* ───────────────── User Achievements Routes ───────────────── */
router.get('/achievements/my', ...gamificationController.getMyAchievements);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminGamificationRouter = Router();

// Admin Airdrop Tasks
adminGamificationRouter.get('/airdrop/tasks', ...gamificationController.listAllAirdropTasks);
adminGamificationRouter.post('/airdrop/tasks', ...gamificationController.createAirdropTask);
adminGamificationRouter.put('/airdrop/tasks/:id', ...gamificationController.updateAirdropTask);
adminGamificationRouter.delete('/airdrop/tasks/:id', ...gamificationController.deleteAirdropTask);
adminGamificationRouter.post(
    '/airdrop/actions/:actionId/verify',
    ...gamificationController.verifyUserAction,
);

// Admin Achievements
adminGamificationRouter.get('/achievements', ...gamificationController.listAllAchievements);
adminGamificationRouter.post('/achievements', ...gamificationController.createAchievement);
adminGamificationRouter.put('/achievements/:id', ...gamificationController.updateAchievement);
adminGamificationRouter.delete('/achievements/:id', ...gamificationController.deleteAchievement);
adminGamificationRouter.post('/achievements/grant', ...gamificationController.grantAchievement);
