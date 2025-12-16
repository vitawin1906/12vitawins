// backend/src/routes/promo.routes.ts
import { Router } from 'express';
import { promoController } from '../controllers/promoController';

const router = Router();

/* ───────────────── Public Promo Routes ───────────────── */
router.get('/', ...promoController.listActivePromotions);
router.get('/:id', ...promoController.getPromotionById);
router.get('/:id/products', ...promoController.getPromotionProducts);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminPromoRouter = Router();

adminPromoRouter.get('/', ...promoController.listAllPromotions);
adminPromoRouter.post('/', ...promoController.createPromotion);
adminPromoRouter.put('/:id', ...promoController.updatePromotion);
adminPromoRouter.delete('/:id', ...promoController.deletePromotion);
adminPromoRouter.post('/:id/toggle', ...promoController.togglePromotion);
adminPromoRouter.post('/:id/products', ...promoController.addProductToPromotion);
adminPromoRouter.delete('/:id/products/:productId', ...promoController.removeProductFromPromotion);
