    // backend/src/controllers/usersController.ts
    import type { Request, Response } from 'express';
    import { z } from 'zod';
    import { authMiddleware } from '../middleware/auth';
    import { requireAdmin } from '../middleware/rbacMiddleware';
    import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
    import {type UpdateUserInput, userService} from '../services/userService';
    import { mlmNetworkService } from '../services/mlmNetworkService';

    /* ───────────────── Validation Schemas ───────────────── */

    const UpdateProfileSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        username: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
    });
    const PathTelegramIdSchema = z.object({ telegramId: z.string().min(1) });

    const ChangePasswordSchema = z.object({
        oldPassword: z.string().min(6),
        newPassword: z.string().min(6),
    });

    const SetPasswordSchema = z.object({
        password: z.string().min(6),
    });

    const AdminUpdateUserSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        username: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        isAdmin: z.boolean().optional(),
        isActive: z.boolean().optional(),
    });

    const UpgradeToPartnerSchema = z.object({
        userId: z.string().uuid(),
    });

    const ChangeRankSchema = z.object({
        userId: z.string().uuid(),
        rank: z.enum(['member', 'лидер', 'создатель']),
    });

    const LockReferrerSchema = z.object({
        userId: z.string().uuid(),
        locked: z.boolean(),
    });

    const ListUsersQuery = z.object({
        q: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
        activeOnly: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
        mlmStatus: z.enum(['customer', 'partner', 'partner_pro']).optional(),
    });

    /* ───────────────── Users Controller ───────────────── */

    export const usersController = {
        /* ───────────────── User Profile (Self) ───────────────── */

        /**
         * GET /api/users/me
         * Профиль текущего пользователя
         */
        getMyProfile: [
            authMiddleware,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = req.user!.id;

                const user = await userService.getUserById(userId);
                if (!user) {
                    throw new AppError(AppErrorCode.NOT_FOUND, 'User not found', 404);
                }

                return res.json({
                    success: true,
                    user: {
                        id: user.id,
                        telegramId: user.telegramId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        email: user.email,
                        phone: user.phone,
                        referralCode: user.referralCode,
                        appliedReferralCode: user.appliedReferralCode,
                        balance: parseFloat(user.balance ?? '0'),
                        isAdmin: user.isAdmin,
                        mlmStatus: user.mlmStatus,
                        rank: user.rank,
                        referrerLocked: user.referrerLocked,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin,
                    },
                });
            }),
        ],

        /**
         * PUT /api/users/me
         * Обновить профиль
         */
        updateMyProfile: [
            authMiddleware,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = req.user!.id;
                const body = UpdateProfileSchema.parse(req.body);

                // exactOptionalPropertyTypes: когда поле присутствует, оно не должно быть `undefined`
                const patch: UpdateUserInput = {
                    ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
                    ...(body.lastName  !== undefined ? { lastName:  body.lastName  } : {}),
                    ...(body.username  !== undefined ? { username:  body.username  } : {}),
                    ...(body.email     !== undefined ? { email:     body.email     } : {}),
                    ...(body.phone     !== undefined ? { phone:     body.phone     } : {}),
                };

                const updated = await userService.updateUser(userId, patch);

                return res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: {
                        id: updated.id,
                        firstName: updated.firstName,
                        lastName: updated.lastName,
                        username: updated.username,
                        email: updated.email,
                        phone: updated.phone,
                    },
                });
            }),
        ],
        /**
         * GET /api/users/me/stats
         * Статистика текущего пользователя (MLM + orders)
         */
        getMyStats: [
            authMiddleware,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = req.user!.id;

                const stats = await mlmNetworkService.getUserNetworkStats(userId);

                return res.json({
                    success: true,
                    stats,
                });
            }),
        ],

        /**
         * POST /api/users/me/change-password
         * Сменить пароль
         */
        changePassword: [
            authMiddleware,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = req.user!.id;
                const { oldPassword, newPassword } = ChangePasswordSchema.parse(req.body);

                await userService.changePassword(userId, oldPassword, newPassword);

                return res.json({
                    success: true,
                    message: 'Password changed successfully',
                });
            }),
        ],

        /**
         * POST /api/users/me/set-password
         * Установить пароль (если еще нет)
         */
        setPassword: [
            authMiddleware,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = req.user!.id;
                const { password } = SetPasswordSchema.parse(req.body);

                await userService.setPassword(userId, password);

                return res.json({
                    success: true,
                    message: 'Password set successfully',
                });
            }),
        ],

        /* ───────────────── Admin: User Management ───────────────── */

        /**
         * GET /api/admin/users
         * Список всех пользователей (админ)
         */
        listUsers: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const query = ListUsersQuery.parse(req.query);

                const filters = {
                    limit: query.limit,
                    offset: query.offset,
                    ...(query.q !== undefined ? { q: query.q } : {}),
                    ...(query.activeOnly !== undefined ? { activeOnly: query.activeOnly } : {}),
                    ...(query.mlmStatus !== undefined ? { mlmStatus: query.mlmStatus } : {}),
                };

                const users = await userService.listUsers(filters);

                return res.json({
                    success: true,
                    users: users.map((u) => ({
                        id: u.id,
                        telegramId: u.telegramId,
                        firstName: u.firstName,
                        lastName: u.lastName,
                        username: u.username,
                        email: u.email,
                        balance: parseFloat(u.balance ?? '0'),
                        isAdmin: u.isAdmin,
                        mlmStatus: u.mlmStatus,
                        rank: u.rank,
                        isActive: u.isActive,
                        referrerLocked: u.referrerLocked,
                        createdAt: u.createdAt,
                        lastLogin: u.lastLogin,
                    })),
                    pagination: {
                        limit: query.limit,
                        offset: query.offset,
                        total: users.length,
                    },
                });
            }),
        ],

        /**
         * GET /api/admin/users/:id
         * Детали пользователя (админ)
         */
        getUserById: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = z.string().uuid().parse(req.params.id); // убираем string|undefined

                const user = await userService.getUserById(userId);
                if (!user) {
                    throw new AppError(AppErrorCode.NOT_FOUND, 'User not found', 404);
                }

                const stats = await mlmNetworkService.getUserNetworkStats(userId);

                // ... далее как было
            }),
        ],

        /**
         * PUT /api/admin/users/:id
         * Обновить пользователя (админ)
         */
        updateUser: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = z.string().uuid().parse(req.params.id); // 👈 строгая строка
                const body = AdminUpdateUserSchema.parse(req.body);

                // exactOptionalPropertyTypes: формируем патч без undefined
                const patch: UpdateUserInput = {
                    ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
                    ...(body.lastName  !== undefined ? { lastName:  body.lastName  } : {}),
                    ...(body.username  !== undefined ? { username:  body.username  } : {}),
                    ...(body.email     !== undefined ? { email:     body.email     } : {}),
                    ...(body.phone     !== undefined ? { phone:     body.phone     } : {}),
                };

                // isActive меняем отдельными методами сервиса
                if (body.isActive === true)  await userService.reactivateUser(userId);
                if (body.isActive === false) await userService.deactivateUser(userId);
                // isAdmin — пропускаем (нет поддержки в storage.updateUser), при необходимости отдельный сервис

                const updated = await userService.updateUser(userId, patch);

                return res.json({
                    success: true,
                    message: 'User updated successfully',
                    user: {
                        id: updated.id,
                        firstName: updated.firstName,
                        lastName: updated.lastName,
                        username: updated.username,
                        email: updated.email,
                        phone: updated.phone,
                        isAdmin: updated.isAdmin,
                        isActive: updated.isActive,
                    },
                });
            }),
        ],

        /**
         * POST /api/admin/users/:id/upgrade-to-partner
         * Апгрейд до партнера (админ)
         */
        upgradeToPartner: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const { userId } = UpgradeToPartnerSchema.parse({ userId: req.params.id });

                await userService.upgradeToPartner(userId, {
                    requireFirstOrder: false, // админ может форсировать
                    minPV: 0,
                });

                const user = await userService.getUserById(userId);

                return res.json({
                    success: true,
                    message: 'User upgraded to partner',
                    user: {
                        id: user!.id,
                        mlmStatus: user!.mlmStatus,
                        rank: user!.rank,
                    },
                });
            }),
        ],

        /**
         * POST /api/admin/users/:id/change-rank
         * Изменить ранг (админ)
         */
        changeRank: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = z.string().uuid().parse(req.params.id);         // 👈 строгая строка
                const { rank } = ChangeRankSchema.pick({ rank: true }).parse(req.body);

                await userService.updateUser(userId, { rank });                // 👈 теперь rank есть в UpdateUserInput

                return res.json({
                    success: true,
                    message: `Rank changed to ${rank}`,
                    rank,
                });
            }),
        ],

        /**
         * POST /api/admin/users/:id/lock-referrer
         * Заблокировать/разблокировать смену реферера (админ)
         */
        lockReferrer: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const { userId, locked } = LockReferrerSchema.parse({ ...req.body, userId: req.params.id });

                if (locked) {
                    await userService.lockReferrer(userId);
                } else {
                    await userService.unlockReferrer(userId);
                }

                return res.json({
                    success: true,
                    message: `Referrer ${locked ? 'locked' : 'unlocked'}`,
                    referrerLocked: locked,
                });
            }),
        ],

        /**
         * POST /api/admin/users/:id/deactivate
         * Деактивировать пользователя (админ)
         */
        deactivateUser: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = z.string().uuid().parse(req.params.id); // 👈 строгая строка
                await userService.deactivateUser(userId);
                return res.json({ success: true, message: 'User deactivated' });
            }),
        ],

        /**
         * POST /api/admin/users/:id/reactivate
         * Реактивировать пользователя (админ)
         */
        reactivateUser: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const userId = z.string().uuid().parse(req.params.id); // 👈 строгая строка
                await userService.reactivateUser(userId);
                return res.json({ success: true, message: 'User reactivated' });
            }),
        ],

        /**
         * GET /api/admin/users/partners
         * Список активных партнеров (админ)
         */
        listActivePartners: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (_req: Request, res: Response) => {
                const partners = await userService.listActivePartners();

                return res.json({
                    success: true,
                    partners: partners.map((p) => ({
                        id: p.id,
                        telegramId: p.telegramId,
                        firstName: p.firstName,
                        username: p.username,
                        mlmStatus: p.mlmStatus,
                        rank: p.rank,
                        createdAt: p.createdAt,
                    })),
                });
            }),
        ],

        /* ───────────────── PRO Assignment Pool Management ───────────────── */

        /**
         * GET /api/admin/users/pro-pool
         * Список PRO-партнеров в пуле автоназначения (админ)
         */
        listProPool: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const { proAssignmentPoolStorage } = await import('../storage/proAssignmentPoolStorage');

                const limit = req.query.limit ? Number(req.query.limit) : 100;
                const offset = req.query.offset ? Number(req.query.offset) : 0;

                const poolRecords = await proAssignmentPoolStorage.list({ limit, offset });
                const totalCount = await proAssignmentPoolStorage.count();

                // Fetch user details for each telegram ID
                const poolWithUsers = await Promise.all(
                    poolRecords.map(async (record) => {
                        const user = await userService.getUserByTelegram(record.telegramId);
                        return {
                            id: record.id,
                            telegramId: record.telegramId,
                            createdAt: record.createdAt,
                            user: user
                                ? {
                                      id: user.id,
                                      firstName: user.firstName,
                                      username: user.username,
                                      mlmStatus: user.mlmStatus,
                                      rank: user.rank,
                                      isActive: user.isActive,
                                  }
                                : null,
                        };
                    }),
                );

                return res.json({
                    success: true,
                    pool: poolWithUsers,
                    pagination: {
                        total: totalCount,
                        limit,
                        offset,
                    },
                });
            }),
        ],

        /**
         * POST /api/admin/users/pro-pool/add
         * Добавить PRO-партнера в пул (админ)
         */
        addToProPool: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const { proAssignmentPoolStorage } = await import('../storage/proAssignmentPoolStorage');

                const { telegramId } = z
                    .object({ telegramId: z.string().min(1) })
                    .parse(req.body);

                // Check if user exists and is PRO partner
                const user = await userService.getUserByTelegram(telegramId);
                if (!user) {
                    throw new AppError(
                        AppErrorCode.NOT_FOUND,
                        'User with this Telegram ID not found',
                        404,
                    );
                }

                if (user.mlmStatus !== 'partner_pro') {
                    throw new AppError(
                        AppErrorCode.VALIDATION_ERROR,
                        'User must be a PRO partner to be added to the pool',
                        400,
                    );
                }

                const record = await proAssignmentPoolStorage.add(telegramId);

                return res.status(201).json({
                    success: true,
                    message: 'PRO partner added to pool',
                    record,
                });
            }),
        ],

        /**
         * DELETE /api/admin/users/pro-pool/:telegramId
         * Удалить PRO-партнера из пула (админ)
         */
    // DELETE /api/admin/users/pro-pool/:telegramId
        removeFromProPool: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const { proAssignmentPoolStorage } = await import('../storage/proAssignmentPoolStorage');

                // ❌ const telegramId = req.params.telegramId;
                const { telegramId } = PathTelegramIdSchema.parse(req.params); // ✅ строго строка

                const removed = await proAssignmentPoolStorage.remove(telegramId);

                if (!removed) {
                    throw new AppError(
                        AppErrorCode.NOT_FOUND,
                        'Telegram ID not found in pool',
                        404,
                    );
                }

                return res.json({ success: true, message: 'PRO partner removed from pool' });
            }),
        ],

        /**
         * GET /api/admin/users/pro-pool/check/:telegramId
         * Проверить наличие в пуле (админ)
         */
    // GET /api/admin/users/pro-pool/check/:telegramId
        checkProPool: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (req: Request, res: Response) => {
                const { proAssignmentPoolStorage } = await import('../storage/proAssignmentPoolStorage');

                // ❌ const telegramId = req.params.telegramId;
                const { telegramId } = PathTelegramIdSchema.parse(req.params); // ✅ строго строка

                const inPool = await proAssignmentPoolStorage.has(telegramId);

                return res.json({ success: true, telegramId, inPool });
            }),
        ],

        /**
         * GET /api/admin/users/pro-pool/stats
         * Статистика PRO пула (админ)
         */
        getProPoolStats: [
            authMiddleware,
            requireAdmin,
            asyncHandler(async (_req: Request, res: Response) => {
                const { proAssignmentPoolStorage } = await import('../storage/proAssignmentPoolStorage');

                const totalInPool = await proAssignmentPoolStorage.count();
                const randomPro = await proAssignmentPoolStorage.pickRandomPro();

                return res.json({
                    success: true,
                    stats: {
                        totalInPool,
                        hasActiveProPartners: !!randomPro,
                    },
                });
            }),
        ],
    };
