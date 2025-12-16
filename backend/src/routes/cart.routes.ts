// backend/src/routes/cart.routes.ts
import { Router } from 'express';
import { cartController } from '../controllers/cartController';

const router = Router();

/* ───────────────── Cart Routes (all require auth) ───────────────── */
router.get('/', ...cartController.getCart);
router.get('/preview', ...cartController.getCartPreview);
router.post('/checkout-preview', ...cartController.getCheckoutPreview);
// ✅ FIX-0.1: Batch sync для локальной корзины (ДОЛЖЕН БЫТЬ ПЕРЕД '/')
router.post('/sync', ...cartController.syncCart);
router.post('/', ...cartController.updateCart);
router.delete('/', ...cartController.clearCart);

export default router;
