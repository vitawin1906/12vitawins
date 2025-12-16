// backend/src/routes/matrixPlacement.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { matrixPlacementService } from '../services/matrixPlacementService';
import { z } from 'zod';

const router = Router();

/* ───────────────── USER: Matrix Placement Info ───────────────── */

/**
 * GET /api/matrix/my-placement
 * Получить информацию о своём размещении в матрице
 */
router.get(
    '/matrix/my-placement',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const placement = await matrixPlacementService.getUserPlacement(userId);

        if (!placement) {
            return res.json({
                success: true,
                placement: null,
                message: 'User not yet placed in matrix',
            });
        }

        // Получить детей
        const children = await matrixPlacementService.getChildren(userId);

        return res.json({
            success: true,
            placement: {
                id: placement.id,
                position: placement.position,
                level: placement.level,
                leftLegVolume: placement.leftLegVolume,
                rightLegVolume: placement.rightLegVolume,
                leftLegCount: placement.leftLegCount,
                rightLegCount: placement.rightLegCount,
                parentId: placement.parentId,
                sponsorId: placement.sponsorId,
                isActive: placement.isActive,
                createdAt: placement.createdAt,
            },
            children: children.map((c) => ({
                userId: c.userId,
                position: c.position,
                level: c.level,
            })),
        });
    })
);

/**
 * GET /api/matrix/my-downline
 * Получить downline в матрице
 */
router.get(
    '/matrix/my-downline',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const QuerySchema = z.object({
            maxDepth: z.coerce.number().int().min(1).max(20).default(5),
        });

        const { maxDepth } = QuerySchema.parse(req.query);

        const downline = await matrixPlacementService.getDownline(userId, maxDepth);

        return res.json({
            success: true,
            downline: downline.map((d) => ({
                userId: d.userId,
                position: d.position,
                level: d.level,
                parentId: d.parentId,
            })),
            count: downline.length,
        });
    })
);

/**
 * GET /api/matrix/my-upline
 * Получить upline в матрице (путь до root)
 */
router.get(
    '/matrix/my-upline',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userId = req.user!.id;

        const upline = await matrixPlacementService.getUpline(userId);

        return res.json({
            success: true,
            upline: upline.map((u) => ({
                userId: u.userId,
                position: u.position,
                level: u.level,
            })),
            count: upline.length,
        });
    })
);

/* ───────────────── ADMIN: Matrix Management ───────────────── */

/**
 * POST /api/admin/matrix/place-user
 * Разместить пользователя в матрице (ручное размещение)
 */
router.post(
    '/admin/matrix/place-user',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const PlaceUserSchema = z.object({
            userId: z.string().uuid(),
            sponsorId: z.string().uuid(),
            preferredPosition: z.enum(['left', 'right']).optional(),
        });

        const { userId, sponsorId, preferredPosition } = PlaceUserSchema.parse(req.body);

        const result = await matrixPlacementService.placeUser(
            userId,
            sponsorId,
            preferredPosition
        );

        return res.json({
            success: true,
            message: 'User placed in matrix successfully',
            result: {
                userId,
                parentId: result.parentId,
                position: result.position,
                level: result.level,
            },
        });
    })
);

/**
 * GET /api/admin/matrix/user/:userId
 * Получить placement конкретного пользователя (админ)
 */
router.get(
    '/admin/matrix/user/:userId',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const ParamsSchema = z.object({
            userId: z.string().uuid(),
        });

        const { userId } = ParamsSchema.parse(req.params);

        const placement = await matrixPlacementService.getUserPlacement(userId);

        if (!placement) {
            throw new AppError(AppErrorCode.NOT_FOUND, 'User not placed in matrix', 404);
        }

        const children = await matrixPlacementService.getChildren(userId);
        const upline = await matrixPlacementService.getUpline(userId);

        return res.json({
            success: true,
            placement: {
                id: placement.id,
                userId: placement.userId,
                position: placement.position,
                level: placement.level,
                leftLegVolume: placement.leftLegVolume,
                rightLegVolume: placement.rightLegVolume,
                leftLegCount: placement.leftLegCount,
                rightLegCount: placement.rightLegCount,
                parentId: placement.parentId,
                sponsorId: placement.sponsorId,
                isActive: placement.isActive,
                createdAt: placement.createdAt,
                updatedAt: placement.updatedAt,
            },
            children: children.map((c) => ({
                userId: c.userId,
                position: c.position,
                level: c.level,
            })),
            upline: upline.map((u) => ({
                userId: u.userId,
                position: u.position,
                level: u.level,
            })),
        });
    })
);

/**
 * POST /api/admin/matrix/update-volume
 * Обновить объём ноги (для тестирования)
 */
router.post(
    '/admin/matrix/update-volume',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const UpdateVolumeSchema = z.object({
            userId: z.string().uuid(),
            leg: z.enum(['left', 'right']),
            volumeToAdd: z.number().min(0),
        });

        const { userId, leg, volumeToAdd } = UpdateVolumeSchema.parse(req.body);

        await matrixPlacementService.updateLegVolume(userId, leg, volumeToAdd);

        return res.json({
            success: true,
            message: 'Leg volume updated successfully',
        });
    })
);

export default router;
