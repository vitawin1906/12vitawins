// backend/src/routes/stats.routes.ts
import { Router } from 'express';
import { statsController } from '../controllers/statsController';

export const adminStatsRouter = Router();

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Получить статистику и аналитику продаж (ADMIN)
 *     operationId: admin_get_stats
 *     security:
 *       - BearerAuth: []
 *     x-roles: ["admin"]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *           default: month
 *         description: Временной диапазон для статистики
 *     responses:
 *       200:
 *         description: Статистика успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     range:
 *                       type: string
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     orders:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         paid:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         cancelled:
 *                           type: integer
 *                         conversionRate:
 *                           type: number
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         average:
 *                           type: number
 *                     users:
 *                       type: object
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     salesByDay:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
adminStatsRouter.get('/', ...statsController.getAdminStats);

export default adminStatsRouter;
