// backend/src/routes/networkFund.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { networkFundService } from '../services/networkFundService';
import { z } from 'zod';

const router = Router();

/* ───────────────── ADMIN: Network Fund Management ───────────────── */

/**
 * GET /api/admin/network-fund/balance
 * Получить баланс сетевого фонда
 */
router.get(
    '/admin/network-fund/balance',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const balance = await networkFundService.getNetworkFundBalance();

        return res.json({
            success: true,
            balance: balance.toFixed(2),
            currency: 'RUB',
        });
    })
);

/**
 * GET /api/admin/network-fund/stats
 * Получить статистику по сетевому фонду
 */
router.get(
    '/admin/network-fund/stats',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const stats = await networkFundService.getFundStats();

        return res.json({
            success: true,
            stats: {
                totalBalance: stats.totalBalance.toFixed(2),
                totalAllocated: stats.totalAllocated.toFixed(2),
                totalDistributed: stats.totalDistributed.toFixed(2),
                pendingDistribution: stats.pendingDistribution.toFixed(2),
            },
        });
    })
);

/**
 * POST /api/admin/network-fund/allocate
 * Вручную начислить средства в фонд из заказа
 */
router.post(
    '/admin/network-fund/allocate',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const AllocateSchema = z.object({
            orderId: z.string().uuid(),
        });

        const { orderId } = AllocateSchema.parse(req.body);

        await networkFundService.allocateFromOrder(orderId);

        return res.json({
            success: true,
            message: 'Network fund allocated successfully',
        });
    })
);

/**
 * POST /api/admin/network-fund/distribute
 * Вручную распределить бонусы из фонда для заказа
 */
router.post(
    '/admin/network-fund/distribute',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const DistributeSchema = z.object({
            orderId: z.string().uuid(),
        });

        const { orderId } = DistributeSchema.parse(req.body);

        const allocation = await networkFundService.distributeBonuses(orderId);

        return res.json({
            success: true,
            message: 'Bonuses distributed successfully',
            allocation: {
                totalFundRub: allocation.totalFundRub.toFixed(2),
                referralBonusesRub: allocation.referralBonusesRub.toFixed(2),
                binaryBonusesRub: allocation.binaryBonusesRub.toFixed(2),
                rankBonusesRub: allocation.rankBonusesRub.toFixed(2),
                unallocatedRub: allocation.unallocatedRub.toFixed(2),
            },
        });
    })
);

/**
 * POST /api/admin/network-fund/withdraw
 * Вручную вывести средства из фонда пользователю
 */
router.post(
    '/admin/network-fund/withdraw',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const WithdrawSchema = z.object({
            userId: z.string().uuid(),
            amountRub: z.number().min(0.01),
            reason: z.string().min(3).max(255),
            orderId: z.string().uuid().optional(),
        });

        const { userId, amountRub, reason, orderId } = WithdrawSchema.parse(req.body);

        await networkFundService.withdrawFromFund(userId, amountRub, reason, orderId);

        return res.json({
            success: true,
            message: 'Withdrawal from network fund completed',
            withdrawal: {
                userId,
                amountRub: amountRub.toFixed(2),
                reason,
            },
        });
    })
);

export default router;
