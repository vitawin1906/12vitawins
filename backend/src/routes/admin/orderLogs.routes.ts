// backend/src/routes/admin/orderLogs.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbacMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import { orderLoggingService } from '../../services/orderLoggingService';
import type { Request, Response } from 'express';

/**
 * ✅ Task 4.2: Админ-эндпойнты для просмотра истории начислений
 *
 * Роуты для просмотра детальной истории изменений по заказам:
 * - GET /api/admin/orders/:id/logs - все логи заказа
 * - GET /api/admin/orders/:id/balance-logs - только изменения балансов
 */

const router = Router();

/**
 * GET /api/admin/orders/:id/logs
 * Получить все логи для заказа
 */
router.get(
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
 * GET /api/admin/orders/:id/balance-logs
 * Получить только логи изменений балансов
 */
router.get(
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

export default router;
