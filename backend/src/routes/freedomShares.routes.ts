// backend/src/routes/freedomShares.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { freedomSharesService, type FreedomSharesArray } from '../services/freedomSharesService';
import { z } from 'zod';

const router = Router();

/* ───────────────── USER: Freedom Shares Management ───────────────── */

/**
 * GET /api/freedom-shares
 * Получить текущие Freedom Shares пользователя
 */
router.get(
    '/freedom-shares',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const shares = await freedomSharesService.getUserShares(userId);
        const balances = await freedomSharesService.getFundBalances(userId);

        return res.json({
            success: true,
            freedomShares: {
                shares: {
                    personalFreedom: shares[0],
                    financialFreedom: shares[1],
                    timeFreedom: shares[2],
                    socialFreedom: shares[3],
                },
                balances,
            },
        });
    })
);

/**
 * PUT /api/freedom-shares
 * Обновить Freedom Shares пользователя
 */
router.put(
    '/freedom-shares',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const UpdateSharesSchema = z.object({
            personalFreedom: z.number().min(0).max(100),
            financialFreedom: z.number().min(0).max(100),
            timeFreedom: z.number().min(0).max(100),
            socialFreedom: z.number().min(0).max(100),
        });

        const body = UpdateSharesSchema.parse(req.body);

        const shares: FreedomSharesArray = [
            body.personalFreedom,
            body.financialFreedom,
            body.timeFreedom,
            body.socialFreedom,
        ];

        // Валидация
        const validation = freedomSharesService.validateShares(shares);
        if (!validation.valid) {
            throw new AppError(AppErrorCode.VALIDATION_ERROR, validation.error!, 400);
        }

        await freedomSharesService.updateUserShares(userId, shares);

        return res.json({
            success: true,
            message: 'Freedom Shares updated successfully',
            shares: {
                personalFreedom: shares[0],
                financialFreedom: shares[1],
                timeFreedom: shares[2],
                socialFreedom: shares[3],
            },
        });
    })
);

/**
 * GET /api/freedom-shares/presets
 * Получить готовые пресеты настроек Freedom Shares
 */
router.get(
    '/freedom-shares/presets',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const presets = freedomSharesService.getPresets();

        // Преобразуем массивы в объекты для удобства клиента
        const presetsFormatted = Object.entries(presets).map(([key, preset]) => ({
            id: key,
            name: preset.name,
            description: preset.description,
            shares: {
                personalFreedom: preset.shares[0],
                financialFreedom: preset.shares[1],
                timeFreedom: preset.shares[2],
                socialFreedom: preset.shares[3],
            },
        }));

        return res.json({
            success: true,
            presets: presetsFormatted,
        });
    })
);

/**
 * POST /api/freedom-shares/apply-preset
 * Применить готовый пресет
 */
router.post(
    '/freedom-shares/apply-preset',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const ApplyPresetSchema = z.object({
            presetId: z.enum(['balanced', 'personal', 'investment', 'development', 'charity']),
        });

        const { presetId } = ApplyPresetSchema.parse(req.body);

        const presets = freedomSharesService.getPresets();
        const preset = presets[presetId];

        if (!preset) {
            throw new AppError(AppErrorCode.NOT_FOUND, 'Preset not found', 404);
        }

        await freedomSharesService.updateUserShares(userId, preset.shares);

        return res.json({
            success: true,
            message: `Applied preset: ${preset.name}`,
            shares: {
                personalFreedom: preset.shares[0],
                financialFreedom: preset.shares[1],
                timeFreedom: preset.shares[2],
                socialFreedom: preset.shares[3],
            },
        });
    })
);

/**
 * POST /api/freedom-shares/simulate
 * Симулировать распределение суммы по текущим Freedom Shares
 */
router.post(
    '/freedom-shares/simulate',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const SimulateSchema = z.object({
            amount: z.number().min(0),
        });

        const { amount } = SimulateSchema.parse(req.body);

        const allocation = await freedomSharesService.allocateAmount(userId, amount);

        return res.json({
            success: true,
            simulation: {
                totalAmount: amount,
                allocation,
            },
        });
    })
);

export default router;
