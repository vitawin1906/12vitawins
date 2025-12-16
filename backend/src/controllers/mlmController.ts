// backend/src/controllers/mlmController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { mlmNetworkService } from '../services/mlmNetworkService';
import {
    attachChildToParent,
    detachChild,
    getUpline,
    listFirstLine,
    type NetworkEdgeRow,
    type UplineHop,
} from '#storage/mlmStorage';

/* ───────────────── Validation Schemas ───────────────── */

const AttachToNetworkSchema = z.object({
    childId: z.string().uuid(),
    parentId: z.string().uuid(),
});

const DetachFromNetworkSchema = z.object({
    childId: z.string().uuid(),
});

const GetNetworkStatsQuery = z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    maxDepth: z.coerce.number().int().min(1).max(64).default(16),
});

/* ───────────────── MLM Controller ───────────────── */

export const mlmController = {
    /* ───────────── User MLM Network ───────────── */

    /** GET /api/mlm/my-network */
    getMyNetwork: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const q = GetNetworkStatsQuery.parse(req.query);

            const opts = {
                maxDepth: q.maxDepth,
                ...(q.dateFrom ? { dateFrom: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { dateTo: new Date(q.dateTo) } : {}),
            };

            const stats = await mlmNetworkService.getUserNetworkStats(userId, opts);
            return res.json({ success: true, stats });
        }),
    ],

    /** GET /api/mlm/my-network/tree */
    getMyNetworkTree: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const firstLine = await listFirstLine(userId);

            const tree = await Promise.all(
                firstLine.map(async (edge: NetworkEdgeRow) => {
                    const childStats = await mlmNetworkService.getUserNetworkStats(edge.childId, { maxDepth: 1 });
                    return {
                        userId: edge.childId,
                        firstName: childStats.firstName,
                        username: childStats.username,
                        telegramId: childStats.telegramId,
                        referralCode: childStats.referralCode,
                        currentLevel: 1,
                        joinedAt: edge.createdAt,
                        directReferrals: childStats.network.directReferrals,
                        personalVolume: childStats.personalVolume,
                    };
                }),
            );

            return res.json({ success: true, tree });
        }),
    ],

    /** GET /api/mlm/my-network/levels */
    getMyNetworkLevels: [
        authMiddleware,
        asyncHandler(async (_req: Request, res: Response) => {
            const userId = _req.user!.id;
            const stats = await mlmNetworkService.getUserNetworkStats(userId, { maxDepth: 16 });

            return res.json({
                success: true,
                levelBreakdown: stats.network.levelBreakdown,
                maxDepth: stats.network.maxDepth,
                totalReferrals: stats.network.totalReferrals,
            });
        }),
    ],

    /** GET /api/mlm/upline */
    getMyUpline: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const upline = await getUpline(userId, 16);

            const uplineDetails = await Promise.all(
                upline.map(async (hop: UplineHop) => {
                    const parentStats = await mlmNetworkService.getUserNetworkStats(hop.parentId, { maxDepth: 1 });
                    return {
                        level: hop.level,
                        userId: hop.parentId,
                        firstName: parentStats.firstName,
                        username: parentStats.username,
                        telegramId: parentStats.telegramId,
                        referralCode: parentStats.referralCode,
                        joinedAt: hop.createdAt,
                    };
                }),
            );

            return res.json({ success: true, upline: uplineDetails });
        }),
    ],

    /** GET /api/mlm/downline */
    getMyDownline: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const firstLine = await listFirstLine(userId);

            const downline = await Promise.all(
                firstLine.map(async (edge: NetworkEdgeRow) => {
                    const childStats = await mlmNetworkService.getUserNetworkStats(edge.childId);
                    return {
                        userId: edge.childId,
                        firstName: childStats.firstName,
                        username: childStats.username,
                        telegramId: childStats.telegramId,
                        referralCode: childStats.referralCode,
                        joinedAt: edge.createdAt,
                        personalVolume: childStats.personalVolume,
                        groupVolume: childStats.groupVolume,
                        directReferrals: childStats.network.directReferrals,
                    };
                }),
            );

            return res.json({ success: true, downline });
        }),
    ],

    /** GET /api/mlm/earnings */
    getMyEarnings: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const stats = await mlmNetworkService.getUserNetworkStats(userId);

            return res.json({
                success: true,
                earnings: {
                    totalEarned: stats.earnings.totalEarned,
                    referralBonuses: stats.earnings.referralBonuses,
                    levelBonuses: stats.earnings.levelBonuses,
                },
            });
        }),
    ],

    /* ───────────── Admin MLM Management ───────────── */

    /** POST /api/admin/mlm/attach */
    attachToNetwork: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { childId, parentId } = AttachToNetworkSchema.parse(req.body);
            await attachChildToParent({ parentId, childId });
            return res.json({ success: true, message: 'User attached to network successfully' });
        }),
    ],

    /** POST /api/admin/mlm/detach */
    detachFromNetwork: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { childId } = DetachFromNetworkSchema.parse(req.body);
            await detachChild(childId);
            return res.json({ success: true, message: 'User detached from network successfully' });
        }),
    ],

    /** POST /api/admin/mlm/move */
    moveInNetwork: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { childId, parentId } = AttachToNetworkSchema.parse(req.body);
            await detachChild(childId);
            await attachChildToParent({ parentId, childId });
            return res.json({ success: true, message: 'User moved to new branch successfully' });
        }),
    ],

    /** GET /api/admin/mlm/user/:userId/network */
    getUserNetworkAdmin: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);
            const q = GetNetworkStatsQuery.parse(req.query);

            const opts = {
                maxDepth: q.maxDepth,
                ...(q.dateFrom ? { dateFrom: new Date(q.dateFrom) } : {}),
                ...(q.dateTo ? { dateTo: new Date(q.dateTo) } : {}),
            };

            const stats = await mlmNetworkService.getUserNetworkStats(userId, opts);
            return res.json({ success: true, userId, stats });
        }),
    ],

    /** GET /api/admin/mlm/network/users - список всех пользователей с их сетевой статистикой */
    getAllNetworkUsers: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { getAllNetworkUsers } = await import('#storage/mlmStorage');
            const users = await getAllNetworkUsers();

            // Получаем детальную статистику для каждого пользователя
            const usersWithStats = await Promise.all(
                users.map(async (user) => {
                    const stats = await mlmNetworkService.getUserNetworkStats(user.id, { maxDepth: 16 });
                    return stats;
                })
            );

            // Считаем общую статистику
            const summary = {
                totalUsers: usersWithStats.length,
                totalPersonalVolume: usersWithStats.reduce((sum, u) => sum + u.personalVolume.totalAmount, 0),
                totalGroupVolume: usersWithStats.reduce((sum, u) => sum + u.groupVolume.totalAmount, 0),
                totalReferrals: usersWithStats.reduce((sum, u) => sum + u.network.totalReferrals, 0),
                totalEarnings: usersWithStats.reduce((sum, u) => sum + u.earnings.totalEarned, 0),
            };

            return res.json({ success: true, data: usersWithStats, summary });
        }),
    ],

    /** GET /api/admin/mlm/network/user/:userId/tree - дерево сети конкретного пользователя */
    getUserNetworkTree: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);
            const { maxDepth = 3 } = z.object({ maxDepth: z.coerce.number().int().min(1).max(10).default(3) }).parse(req.query);

            const buildTree = async (rootId: string, depth: number): Promise<any> => {
                if (depth <= 0) return null;

                const stats = await mlmNetworkService.getUserNetworkStats(rootId, { maxDepth: 1 });
                const children = await listFirstLine(rootId);

                return {
                    userId: rootId,
                    firstName: stats.firstName,
                    username: stats.username,
                    telegramId: stats.telegramId,
                    referralCode: stats.referralCode,
                    currentLevel: 1,
                    personalVolume: stats.personalVolume,
                    groupVolume: stats.groupVolume,
                    directReferrals: stats.network.directReferrals,
                    children: await Promise.all(
                        children.map((edge: NetworkEdgeRow) => buildTree(edge.childId, depth - 1))
                    ),
                };
            };

            const tree = await buildTree(userId, maxDepth);
            return res.json({ success: true, tree });
        }),
    ],

    /** GET /api/admin/mlm/orphans — не реализовано в storage */
    listOrphans: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, _res: Response) => {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                'Listing orphans is not implemented in storage; add storage method first',
                501,
            );
        }),
    ],

    /** GET /api/admin/mlm/network-health — не реализовано в storage */
    checkNetworkHealth: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, _res: Response) => {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                'Network health check is not implemented in storage; add storage methods first',
                501,
            );
        }),
    ],
};
