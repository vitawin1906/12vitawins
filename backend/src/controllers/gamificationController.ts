// backend/src/controllers/gamificationController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { gamificationStorage } from '#storage/gamificationStorage';

/* ───────────────── Validation Schemas ───────────────── */

const ZPayload = z
    .record(z.string(), z.unknown()) // ключ: string, значение: unknown
    .optional()
    // пустой объект → undefined (для совместимости с типами storage)
    .transform((p) => (p && Object.keys(p).length ? (p as Record<string, unknown>) : undefined));

const UpsertUserActionSchema = z.object({
    taskId: z.string().uuid(),
    payload: ZPayload,
    verified: z.boolean().optional(),
});

const GrantAchievementSchema = z.object({
    achievementId: z.string().uuid(),
});

const VerifyActionSchema = z.object({
    verified: z.boolean(),
    userId: z.string().uuid(),
    taskId: z.string().uuid(),
});

// params schemas (Zod вместо Request<{...}>)
const IdParam        = z.object({ id: z.string().uuid() });
const ActionIdParam  = z.object({ actionId: z.string().uuid() });

/* ───────────────── Gamification Controller ───────────────── */

export const gamificationController = {
    /* ───────────────── User Airdrop Tasks ───────────────── */

    /**
     * GET /api/airdrop/tasks
     * Список активных airdrop заданий (PUBLIC)
     */
    listAirdropTasks: [
        asyncHandler(async (_req: Request, res: Response) => {
            const tasks = await gamificationStorage.listAirdropTasks();
            const activeTasks = tasks.filter((t) => t.isActive);

            return res.json({
                success: true,
                tasks: activeTasks.map((t) => ({
                    id: t.id,
                    code: t.code,
                    title: t.title,
                    description: t.description,
                    trigger: t.trigger,
                    rewardVwc: t.rewardVwc,
                })),
            });
        }),
    ],

    /**
     * GET /api/airdrop/tasks/:id
     * Детали airdrop задания (PUBLIC)
     */
    getAirdropTask: [
        asyncHandler(async (req: Request, res: Response) => {
            const { id: taskId } = IdParam.parse(req.params);
            const task = await gamificationStorage.getAirdropTask(taskId);
            if (!task) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Task not found', 404);
            }
            return res.json({ success: true, task });
        }),
    ],

    /**
     * GET /api/airdrop/my-actions
     * Мои выполненные задания (USER)
     */
    getMyAirdropActions: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const actions = await gamificationStorage.listUserAirdropActions(userId);
            return res.json({ success: true, actions });
        }),
    ],

    /**
     * POST /api/airdrop/actions
     * Отметить выполнение задания (USER)
     */
    upsertUserAirdropAction: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const body = UpsertUserActionSchema.parse(req.body);

            // Проверяем, что задание существует и активно
            const task = await gamificationStorage.getAirdropTask(body.taskId);
            if (!task) throw new AppError(AppErrorCode.NOT_FOUND, 'Task not found', 404);
            if (!task.isActive) {
                throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Task is not active', 400);
            }

            const action = await gamificationStorage.upsertUserAirdropAction(
                userId,
                body.taskId,
                body.payload, // Record<string,unknown> | undefined
                body.verified ?? false,
            );

            return res.json({ success: true, message: 'Action recorded successfully', action });
        }),
    ],

    /* ───────────────── User Achievements ───────────────── */

    /**
     * GET /api/achievements
     * Список активных достижений (PUBLIC)
     */
    listAchievements: [
        asyncHandler(async (_req: Request, res: Response) => {
            const achievements = await gamificationStorage.listAchievements();
            const activeAchievements = achievements.filter((a) => a.isActive);

            return res.json({
                success: true,
                achievements: activeAchievements.map((a) => ({
                    id: a.id,
                    code: a.code,
                    title: a.title,
                    description: a.description,
                    rewardVwc: a.rewardVwc,
                })),
            });
        }),
    ],

    /**
     * GET /api/achievements/:id
     * Детали достижения (PUBLIC)
     */
    getAchievement: [
        asyncHandler(async (req: Request, res: Response) => {
            const { id: achievementId } = IdParam.parse(req.params);
            const achievement = await gamificationStorage.getAchievement(achievementId);
            if (!achievement) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Achievement not found', 404);
            }
            return res.json({ success: true, achievement });
        }),
    ],

    /**
     * GET /api/achievements/my
     * Мои полученные достижения (USER)
     */
    getMyAchievements: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const userAchievements = await gamificationStorage.listUserAchievements(userId);
            return res.json({ success: true, achievements: userAchievements });
        }),
    ],

    /* ───────────────── Admin Airdrop Tasks Management ───────────────── */

    /**
     * GET /api/admin/airdrop/tasks
     * Все airdrop задания включая неактивные (ADMIN)
     */
    listAllAirdropTasks: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const tasks = await gamificationStorage.listAirdropTasks();
            return res.json({ success: true, tasks });
        }),
    ],

    /**
     * POST /api/admin/airdrop/tasks
     * Создать airdrop задание (ADMIN)
     */
    createAirdropTask: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const task = await gamificationStorage.createAirdropTask(req.body);
            return res.status(201).json({ success: true, message: 'Airdrop task created successfully', task });
        }),
    ],

    /**
     * PUT /api/admin/airdrop/tasks/:id
     * Обновить airdrop задание (ADMIN)
     */
    updateAirdropTask: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: taskId } = IdParam.parse(req.params);
            const task = await gamificationStorage.updateAirdropTask(taskId, req.body);
            if (!task) throw new AppError(AppErrorCode.NOT_FOUND, 'Task not found', 404);
            return res.json({ success: true, message: 'Airdrop task updated successfully', task });
        }),
    ],

    /**
     * DELETE /api/admin/airdrop/tasks/:id
     * Удалить airdrop задание (ADMIN)
     */
    deleteAirdropTask: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: taskId } = IdParam.parse(req.params);
            const task = await gamificationStorage.deleteAirdropTask(taskId);
            if (!task) throw new AppError(AppErrorCode.NOT_FOUND, 'Task not found', 404);
            return res.json({ success: true, message: 'Airdrop task deleted successfully' });
        }),
    ],

    /**
     * POST /api/admin/airdrop/actions/:actionId/verify
     * Верифицировать выполнение задания пользователем (ADMIN)
     *
     * Параметр actionId валидируем, но сам storage не использует его напрямую.
     */
    verifyUserAction: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            // валидируем наличие actionId в params, даже если не используем
            ActionIdParam.parse(req.params);

            const { verified, userId, taskId } = VerifyActionSchema.parse(req.body);

            const updated = await gamificationStorage.upsertUserAirdropAction(
                userId,
                taskId,
                undefined,
                verified,
            );

            return res.json({
                success: true,
                message: `Action ${verified ? 'verified' : 'unverified'}`,
                action: updated,
            });
        }),
    ],

    /* ───────────────── Admin Achievements Management ───────────────── */

    /**
     * GET /api/admin/achievements
     * Все достижения включая неактивные (ADMIN)
     */
    listAllAchievements: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const achievements = await gamificationStorage.listAchievements();
            return res.json({ success: true, achievements });
        }),
    ],

    /**
     * POST /api/admin/achievements
     * Создать достижение (ADMIN)
     */
    createAchievement: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const achievement = await gamificationStorage.createAchievement(req.body);
            return res.status(201).json({ success: true, message: 'Achievement created successfully', achievement });
        }),
    ],

    /**
     * PUT /api/admin/achievements/:id
     * Обновить достижение (ADMIN)
     */
    updateAchievement: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: achievementId } = IdParam.parse(req.params);
            const achievement = await gamificationStorage.updateAchievement(achievementId, req.body);
            if (!achievement) throw new AppError(AppErrorCode.NOT_FOUND, 'Achievement not found', 404);
            return res.json({ success: true, message: 'Achievement updated successfully', achievement });
        }),
    ],

    /**
     * DELETE /api/admin/achievements/:id
     * Удалить достижение (ADMIN)
     */
    deleteAchievement: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: achievementId } = IdParam.parse(req.params);
            const achievement = await gamificationStorage.deleteAchievement(achievementId);
            if (!achievement) throw new AppError(AppErrorCode.NOT_FOUND, 'Achievement not found', 404);
            return res.json({ success: true, message: 'Achievement deleted successfully' });
        }),
    ],

    /**
     * POST /api/admin/achievements/grant
     * Выдать достижение пользователю (ADMIN)
     */
    grantAchievement: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
            const body = GrantAchievementSchema.parse(req.body);

            const achievement = await gamificationStorage.getAchievement(body.achievementId);
            if (!achievement) throw new AppError(AppErrorCode.NOT_FOUND, 'Achievement not found', 404);

            const userAchievement = await gamificationStorage.grantAchievement(userId, body.achievementId);
            return res.json({ success: true, message: 'Achievement granted successfully', userAchievement });
        }),
    ],
};
