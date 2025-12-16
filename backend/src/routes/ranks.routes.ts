// backend/src/routes/ranks.routes.ts
import { Router } from 'express';
import { ranksController } from '../controllers/ranksController';

const router = Router();

/* ───────────────── Public Routes ───────────────── */
router.get('/', ...ranksController.listRanks);
router.get('/:rank', ...ranksController.getRankByCode);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminRanksRouter = Router();

adminRanksRouter.post('/', ...ranksController.createRank);
adminRanksRouter.put('/:rank', ...ranksController.updateRank);
adminRanksRouter.delete('/:rank', ...ranksController.deleteRank);
adminRanksRouter.post('/ensure-creator', ...ranksController.ensureCreatorRank);
