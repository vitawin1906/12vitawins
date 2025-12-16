// backend/src/routes/payments.routes.ts
import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';

const router = Router();

/* ───────────────── User Payment Routes ───────────────── */
router.post('/', ...paymentController.createPayment);
router.get('/my', ...paymentController.getMyPayments);
router.get('/:id', ...paymentController.getPaymentStatus);

/* ───────────────── Tinkoff Webhooks & Redirects (no auth) ───────────────── */
router.post('/tinkoff/notification', ...paymentController.tinkoffNotification);
router.get('/tinkoff/success', ...paymentController.tinkoffSuccess);
router.get('/tinkoff/fail', ...paymentController.tinkoffFail);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminPaymentsRouter = Router();

adminPaymentsRouter.get('/', ...paymentController.listAllPayments);
adminPaymentsRouter.get('/stats', ...paymentController.getPaymentStats);  // ✅ ДОБАВЛЕНО
adminPaymentsRouter.post('/:id/retry', ...paymentController.retryPayment); // ✅ ДОБАВЛЕНО
adminPaymentsRouter.get('/:id', ...paymentController.getPaymentStatus);
