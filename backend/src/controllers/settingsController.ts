// backend/src/controllers/settingsController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { settingsStorage } from '../storage/settingsStorage';

/* ───────────────── Validation Schemas ───────────────── */

const InsertVersionSchema = z.object({
    key: z.string().min(1),
    valueJson: z.any(),
});

const KeyParam = z.object({
    key: z.string().min(1),
});

/* ───────────────── Settings Controller ───────────────── */

export const settingsController = {
    /* ───────────────── Public Settings (read-only) ───────────────── */

    /**
     * GET /api/settings/:key
     * Получить активное значение настройки (PUBLIC для некоторых ключей)
     */
    getActiveValue: [
        asyncHandler(async (req: Request, res: Response) => {
            const { key } = KeyParam.parse(req.params);

            // Whitelist публично доступных настроек
            const publicKeys = [
                'free_shipping_threshold_rub',
                'vwc_ttl_days',
                'discount_priority',
            ] as const;

            if (!publicKeys.includes(key as (typeof publicKeys)[number])) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'This setting is not publicly accessible',
                    403,
                );
            }

            try {
                const value = await settingsStorage.getActiveValue(key);
                return res.json({ success: true, key, value });
            } catch (error: any) {
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    error?.message || 'Setting not found',
                    404,
                );
            }
        }),
    ],

    /* ───────────────── Admin Settings Management ───────────────── */

    /**
     * GET /api/admin/settings/:key
     * Получить активное значение любой настройки (ADMIN)
     */
    getAdminActiveValue: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { key } = KeyParam.parse(req.params);

            try {
                const value = await settingsStorage.getActiveValue(key);
                return res.json({ success: true, key, value });
            } catch (error: any) {
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    error?.message || 'Setting not found',
                    404,
                );
            }
        }),
    ],

    /**
     * POST /api/admin/settings
     * Добавить новую версию настройки (ADMIN)
     */
    insertVersion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = InsertVersionSchema.parse(req.body);

            const setting = await settingsStorage.insertVersion(body.key, body.valueJson);

            // Invalidate cache
            settingsStorage.invalidateCache(body.key);

            return res.status(201).json({
                success: true,
                message: 'Setting version created successfully',
                setting,
            });
        }),
    ],

    /**
     * POST /api/admin/settings/ensure-defaults
     * Убедиться, что все дефолтные настройки инициализированы (ADMIN)
     */
    ensureDefaults: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            await settingsStorage.ensureDefaults();
            return res.json({ success: true, message: 'Default settings ensured' });
        }),
    ],

    /**
     * GET /api/admin/settings/keys
     * Список всех ключей настроек (ADMIN)
     */
    listSettingKeys: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            // Helper endpoint
            const keys = [
                'levels_matrix',
                'discount_priority',
                'vwc_ttl_days',
                'free_shipping_threshold_rub',
                'fast_start',
                'infinity',
                'option3',
                'first_pool',
            ];
            return res.json({ success: true, keys });
        }),
    ],

    /**
     * POST /api/admin/settings/invalidate-cache
     * Инвалидировать кэш для конкретной настройки (ADMIN)
     */
    invalidateCache: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { key } = z.object({ key: z.string().min(1) }).parse(req.body);

            settingsStorage.invalidateCache(key);

            return res.json({
                success: true,
                message: `Cache invalidated for ${key}`,
            });
        }),
    ],
};
