// src/routes/withdrawals.routes.ts
import { Router } from 'express';
import { withdrawalController } from '../controllers/withdrawalController';

const withdrawalsRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Withdrawals
 *     description: Запросы на вывод средств
 */

// User endpoints under /api/withdrawals
/**
 * @swagger
 * /api/withdrawals:
 *   post:
 *     tags: [Withdrawals]
 *     operationId: withdrawals_create
 *     summary: Создать запрос на вывод
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amountRub: { $ref: '#/components/schemas/MoneyString' }
 *               method: { type: string, description: 'Способ вывода (см. enums в БД)' }
 *               destination: { type: object }
 *               idempotencyKey: { type: string }
 *             required: [amountRub, method, idempotencyKey]
 *           examples:
 *             sample:
 *               value:
 *                 amountRub: "1000.00"
 *                 method: "tinkoff"
 *                 destination: { cardLast4: "1234" }
 *                 idempotencyKey: "withdraw-req-123"
 *     responses:
 *       201:
 *         description: Создано
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Недостаточно средств или ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Превышен лимит активных заявок
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
withdrawalsRouter.post('/', ...withdrawalController.create);

/**
 * @swagger
 * /api/withdrawals/me:
 *   get:
 *     tags: [Withdrawals]
 *     operationId: withdrawals_list_my
 *     summary: Мои заявки на вывод
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Список заявок
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
withdrawalsRouter.get('/me', ...withdrawalController.myList);

/**
 * @swagger
 * /api/withdrawals/{id}:
 *   delete:
 *     tags: [Withdrawals]
 *     operationId: withdrawals_cancel
 *     summary: Отменить свою заявку
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     responses:
 *       200:
 *         description: Отменено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
withdrawalsRouter.delete('/:id', ...withdrawalController.cancel);

// Admin endpoints exported as separate router mounted at /api/admin/withdrawals
const adminWithdrawalsRouter = Router();

/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     tags: [Withdrawals]
 *     operationId: admin_withdrawals_list
 *     summary: Список заявок на вывод (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Список заявок
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminWithdrawalsRouter.get('/', ...withdrawalController.adminList);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/approve:
 *   post:
 *     tags: [Withdrawals]
 *     operationId: admin_withdrawals_approve
 *     summary: Подтвердить заявку (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     responses:
 *       200:
 *         description: Подтверждено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Недостаточно средств
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
adminWithdrawalsRouter.post('/:id/approve', ...withdrawalController.adminApprove);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/reject:
 *   post:
 *     tags: [Withdrawals]
 *     operationId: admin_withdrawals_reject
 *     summary: Отклонить заявку (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     responses:
 *       200:
 *         description: Отклонено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminWithdrawalsRouter.post('/:id/reject', ...withdrawalController.adminReject);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/mark-paid:
 *   post:
 *     tags: [Withdrawals]
 *     operationId: admin_withdrawals_mark_paid
 *     summary: Отметить как оплаченный (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     responses:
 *       200:
 *         description: Отмечено как оплачено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminWithdrawalsRouter.post('/:id/mark-paid', ...withdrawalController.adminMarkPaid);

export default withdrawalsRouter;
export { adminWithdrawalsRouter };
