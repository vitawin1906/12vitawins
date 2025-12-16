// backend/src/controllers/userBonusPreferencesController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { userBonusPreferencesService } from '../services/userBonusPreferencesService';

/**
 * Валидация бонусных процентов
 * Все поля 0–100, сумма = 100
 */
const UpdatePreferencesBody = z
    .object({
        health_percent: z.number().min(0).max(100),
        travel_percent: z.number().min(0).max(100),
        home_percent: z.number().min(0).max(100),
        auto_percent: z.number().min(0).max(100),
    })
    .refine(
        (data) =>
            data.health_percent +
            data.travel_percent +
            data.home_percent +
            data.auto_percent === 100,
        {
            message: 'Сумма всех процентов должна равняться 100%',
        },
    );

const LockPreferencesBody = z.object({
    isLocked: z.boolean(),
});

const UserIdParam = z.object({
    userId: z.string().uuid(),
});

/**
 * User Bonus Preferences Controller
 * Manages distribution of bonuses across 4 categories: health, travel, home, auto
 */
export const userBonusPreferencesController = {
    /**
     * GET /api/user/bonus-preferences
     * Get current user's bonus preferences (or create default)
     */
    getUserPreferences: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const preferences = await userBonusPreferencesService.getOrCreatePreferences(userId);

            return res.json({ success: true, data: preferences });
        }),
    ],

    /**
     * PUT /api/user/bonus-preferences
     * Update current user's bonus preferences
     */
    updateUserPreferences: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const body = UpdatePreferencesBody.parse(req.body);

            const updated = await userBonusPreferencesService.updatePreferences(userId, {
                healthPercent: body.health_percent,
                travelPercent: body.travel_percent,
                homePercent: body.home_percent,
                autoPercent: body.auto_percent,
            });

            return res.json({
                success: true,
                message: 'Настройки успешно обновлены',
                data: updated,
            });
        }),
    ],

    /**
     * POST /api/admin/user-bonus-preferences/:userId/lock
     * Lock or unlock user's bonus preferences (admin only)
     */
    lockUserPreferences: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = UserIdParam.parse(req.params);
            const { isLocked } = LockPreferencesBody.parse(req.body);

            const updated = await userBonusPreferencesService.setLocked(userId, isLocked);

            return res.json({
                success: true,
                message: `Настройки ${isLocked ? 'заблокированы' : 'разблокированы'}`,
                data: updated,
            });
        }),
    ],

    /**
     * GET /api/admin/user-bonus-preferences
     * Get all users' bonus preferences with user info (admin only)
     */
    getAllUsersPreferences: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const data = await userBonusPreferencesService.listAllWithUsers();

            return res.json({ success: true, data });
        }),
    ],
};
