// backend/src/controllers/activationPackageController.ts
import type { Request, Response } from 'express';
import { activationPackageService } from '../services/activationPackageService';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import {
    PurchasePartnerSchema,
    PurchasePartnerProSchema,
    UpgradeToPartnerProSchema,
    GetUserPackagesSchema,
    GetAllPackagesSchema,
    CheckUpgradeEligibilitySchema,
} from '../validation/activationPackageSchemas';
import {asyncHandler} from "../middleware/errorHandler";

/**
 * Controller для Activation Packages
 * Endpoints:
 *   POST   /api/activation-packages/partner
 *   POST   /api/activation-packages/partner-pro
 *   POST   /api/activation-packages/upgrade
 *   GET    /api/activation-packages/my
 *   GET    /api/admin/activation-packages
 *   GET    /api/admin/activation-packages/stats
 *   GET    /api/admin/activation-packages/:userId/can-upgrade
 */

export const activationPackageController = {
    /**
     * POST /api/activation-packages/partner
     * Покупка пакета Partner (7500 RUB)
     */
    purchasePartner: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            // Валидация (пока тела нет)
            PurchasePartnerSchema.parse({ body: req.body });

            const userId = req.user!.id;

            // Вызов сервиса
            const packageRecord = await activationPackageService.purchasePartnerPackage(userId);

            return res.status(201).json({
                success: true,
                data: packageRecord,
                message: 'Partner package purchased successfully',
            });
        }),
    ],

    /**
     * POST /api/activation-packages/partner-pro
     * Покупка пакета Partner Pro (30000 RUB)
     */
    purchasePartnerPro: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            PurchasePartnerProSchema.parse({ body: req.body });

            const userId = req.user!.id;

            const packageRecord = await activationPackageService.purchasePartnerProPackage(userId);

            return res.status(201).json({
                success: true,
                data: packageRecord,
                message: 'Partner Pro package purchased successfully',
            });
        }),
    ],

    /**
     * POST /api/activation-packages/upgrade
     * Upgrade Partner → Partner Pro
     */
    upgradeToPartnerPro: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            UpgradeToPartnerProSchema.parse({ body: req.body });

            const userId = req.user!.id;

            const packageRecord = await activationPackageService.upgradeToPartnerPro(userId);

            return res.status(201).json({
                success: true,
                data: packageRecord,
                message: 'Upgraded to Partner Pro successfully',
            });
        }),
    ],

    /**
     * GET /api/activation-packages/my
     * Получить мои пакеты активации
     */
    getMyPackages: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const packages = await activationPackageService.getUserPackages(userId);

            return res.json({
                success: true,
                data: packages,
            });
        }),
    ],

    /**
     * GET /api/activation-packages/can-upgrade
     * Проверить, могу ли я апгрейдиться до Partner Pro
     */
    checkMyUpgradeEligibility: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const canUpgrade = await activationPackageService.canUpgradeToPartnerPro(userId);

            return res.json({
                success: true,
                data: {
                    canUpgrade,
                },
            });
        }),
    ],

    /**
     * GET /api/admin/activation-packages
     * [ADMIN] Получить все пакеты активации
     */
    getAllPackages: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { query } = GetAllPackagesSchema.parse({ query: req.query });

            const limit = query?.limit ?? 20;
            const offset = query?.offset ?? 0;

            const packages = await activationPackageService.getAllPackages(limit, offset);

            return res.json({
                success: true,
                data: packages,
                pagination: {
                    limit,
                    offset,
                },
            });
        }),
    ],

    /**
     * GET /api/admin/activation-packages/stats
     * [ADMIN] Статистика по пакетам
     */
    getStats: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const stats = await activationPackageService.getPackageStats();

            return res.json({
                success: true,
                data: stats,
            });
        }),
    ],

    /**
     * GET /api/admin/activation-packages/:userId/can-upgrade
     * [ADMIN] Проверить, может ли пользователь апгрейдиться
     */
    checkUserUpgradeEligibility: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { params } = CheckUpgradeEligibilitySchema.parse({ params: req.params });

            const canUpgrade = await activationPackageService.canUpgradeToPartnerPro(params.userId);

            return res.json({
                success: true,
                data: {
                    userId: params.userId,
                    canUpgrade,
                },
            });
        }),
    ],

    /**
     * GET /api/admin/activation-packages/user/:userId
     * [ADMIN] Получить пакеты конкретного пользователя
     */
    getUserPackages: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'userId is required',
                });
            }

            const packages = await activationPackageService.getUserPackages(userId);

            return res.json({
                success: true,
                data: packages,
            });
        }),
    ],
};
