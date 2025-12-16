// backend/src/routes/orders.routes.ts
import { Router } from 'express';
import { ordersController } from '../controllers/ordersController';
import { orderCreationLimiter } from '../middleware/rateLimiter';
import { orderLoggingService } from '../services/orderLoggingService'; // ✅ Task 4.2
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';
import type { Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Операции с заказами
 */

/* ───────────────── User Order Routes ───────────────── */
/**
 * @swagger
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     operationId: orders_create
 *     security:
 *       - BearerAuth: []
 *     summary: Создать заказ из корзины
 *     responses:
 *       201:
 *         description: Заказ создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       400:
 *         description: Ошибка валидации (например, пустая корзина, недостаток стока)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', orderCreationLimiter, ...ordersController.createOrder);

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     tags: [Orders]
 *     operationId: orders_list_my
 *     security:
 *       - BearerAuth: []
 *     summary: Мои заказы
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Список заказов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
router.get('/my', ...ordersController.getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     operationId: orders_get_by_id
 *     security:
 *       - BearerAuth: []
 *     summary: Получить заказ по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     responses:
 *       200:
 *         description: Детали заказа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       404:
 *         description: Заказ не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', ...ordersController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     operationId: orders_cancel
 *     security:
 *       - BearerAuth: []
 *     summary: Отменить заказ (если допустимо)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     responses:
 *       200:
 *         description: Отменён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 *       409:
 *         description: Недопустимое состояние заказа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/cancel', ...ordersController.cancelOrder);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminOrdersRouter = Router();

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     tags: [Orders]
 *     operationId: admin_orders_list
 *     summary: Список заказов (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Список заказов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminOrdersRouter.get('/', ...ordersController.listAllOrders);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     operationId: admin_orders_get_by_id
 *     summary: Получить заказ по ID (ADMIN)
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
 *         description: Детали заказа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminOrdersRouter.get('/:id', ...ordersController.getOrderByIdAdmin);

/**
 * @swagger
 * /api/admin/orders/{id}/mark-delivered:
 *   post:
 *     tags: [Orders]
 *     operationId: admin_orders_mark_delivered
 *     summary: Пометить доставленным (ADMIN)
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
 *         description: Помечен доставленным
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     tags: [Orders]
 *     operationId: admin_orders_update_status
 *     summary: Обновить статус заказа (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: Новый статус заказа
 *           examples:
 *             processing:
 *               value: { status: "processing" }
 *     responses:
 *       200:
 *         description: Статус обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminOrdersRouter.put('/:id/status', ...ordersController.updateOrderStatus);

/**
 * @swagger
 * /api/admin/orders/{id}/delivery-status:
 *   put:
 *     tags: [Orders]
 *     operationId: admin_orders_update_delivery_status
 *     summary: Обновить статус доставки (ADMIN)
 *     x-roles: ["admin"]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryStatus:
 *                 type: string
 *               trackingCode:
 *                 type: string
 *           examples:
 *             shipped:
 *               value: { deliveryStatus: "in_transit", trackingCode: "AB123456789RU" }
 *     responses:
 *       200:
 *         description: Статус доставки обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminOrdersRouter.put('/:id/delivery-status', ...ordersController.updateDeliveryStatus);

/**
 * @swagger
 * /api/admin/orders/{id}/mark-delivered:
 *   post:
 *     tags: [Orders]
 *     operationId: admin_orders_mark_delivered
 *     summary: Пометить доставленным (ADMIN)
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
 *         description: Помечен доставленным
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessEnvelope'
 */
adminOrdersRouter.post('/:id/mark-delivered', ...ordersController.markAsDelivered);

/**
 * ✅ Task 4.2: Админ-эндпойнты для просмотра истории начислений
 * GET /api/admin/orders/:id/logs - все логи заказа
 */
adminOrdersRouter.get(
    '/:id/logs',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const { id: orderId } = z.object({ id: z.string().uuid() }).parse(req.params);
        const logs = await orderLoggingService.getOrderLogs(orderId);

        return res.json({
            success: true,
            orderId,
            logs: logs.map((log) => ({
                id: log.id,
                event: log.event,
                meta: log.meta,
                createdAt: log.createdAt,
            })),
        });
    })
);

/**
 * ✅ Task 4.2: Админ-эндпойнты для просмотра истории начислений
 * GET /api/admin/orders/:id/balance-logs - только изменения балансов
 */
adminOrdersRouter.get(
    '/:id/balance-logs',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const { id: orderId } = z.object({ id: z.string().uuid() }).parse(req.params);
        const logs = await orderLoggingService.getBalanceChangeLogs(orderId);

        return res.json({
            success: true,
            orderId,
            balanceLogs: logs.map((log) => ({
                id: log.id,
                event: log.event,
                meta: log.meta,
                createdAt: log.createdAt,
            })),
        });
    })
);
