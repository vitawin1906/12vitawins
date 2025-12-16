// backend/src/routes/partnerUpgrade.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { partnerUpgradeService } from '../services/partnerUpgradeService';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/admin/partner-upgrade/batch
 * Batch обработка: проверить всех customers на возможность upgrade
 */
router.post(
    '/admin/partner-upgrade/batch',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const BatchSchema = z.object({
            limit: z.number().int().min(1).max(1000).default(100),
        });

        const { limit } = BatchSchema.parse(req.body);

        const result = await partnerUpgradeService.upgradeEligibleCustomers(limit);

        return res.json({
            success: true,
            message: `Batch upgrade completed`,
            result,
        });
    })
);

/**
 * POST /api/admin/partner-upgrade/user/:userId
 * Проверить и выполнить upgrade конкретного пользователя
 */
router.post(
    '/admin/partner-upgrade/user/:userId',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const ParamsSchema = z.object({
            userId: z.string().uuid(),
        });

        const { userId } = ParamsSchema.parse(req.params);

        const upgraded = await partnerUpgradeService.checkAndUpgradeUser(userId);

        return res.json({
            success: true,
            upgraded,
            message: upgraded
                ? `User ${userId} upgraded to Partner`
                : `User ${userId} not eligible for upgrade or already Partner`,
        });
    })
);

export default router;
