// backend/src/controllers/rbacController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { rbacStorage, type RbacRole } from '#storage/rbacStorage';
import { usersStorage } from '#storage/usersStorage';

/* ───────────────── Validation Schemas ───────────────── */

const AssignRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(['admin', 'finance', 'support', 'editor'] as const),
});

const RevokeRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(['admin', 'finance', 'support', 'editor'] as const),
});

const ListByRoleSchema = z.object({
    role: z.enum(['admin', 'finance', 'support', 'editor'] as const),
});

/* ───────────────── RBAC Controller ───────────────── */

export const rbacController = {
    /* ───────────────── Role Management ───────────────── */

    /**
     * POST /api/admin/rbac/assign
     * Назначить роль пользователю
     */
    assignRole: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = AssignRoleSchema.parse(req.body);

            // Check if user exists
            const user = await usersStorage.getUserById(body.userId);
            if (!user) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'User not found', 404);
            }

            // Check if role is already assigned
            const hasRole = await rbacStorage.hasRole(body.userId, body.role);
            if (hasRole) {
                return res.json({
                    success: true,
                    message: 'User already has this role',
                    role: body.role,
                });
            }

            const assignment = await rbacStorage.assignRole(body.userId, body.role);

            return res.status(201).json({
                success: true,
                message: 'Role assigned successfully',
                assignment,
            });
        }),
    ],

    /**
     * POST /api/admin/rbac/revoke
     * Отозвать роль у пользователя
     */
    revokeRole: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = RevokeRoleSchema.parse(req.body);

            const revoked = await rbacStorage.revokeRole(body.userId, body.role);

            if (!revoked) {
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'User does not have this role',
                    404,
                );
            }

            return res.json({
                success: true,
                message: 'Role revoked successfully',
            });
        }),
    ],

    /**
     * GET /api/admin/rbac/users/:userId/roles
     * Получить все роли пользователя
     */
    getUserRoles: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = z.string().uuid().parse(req.params.userId);

            // Check if user exists
            const user = await usersStorage.getUserById(userId);
            if (!user) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'User not found', 404);
            }

            const roles = await rbacStorage.getUserRoles(userId);

            return res.json({
                success: true,
                userId,
                roles: roles.map((r) => r.role),
            });
        }),
    ],

    /**
     * GET /api/admin/rbac/roles/:role/users
     * Получить всех пользователей с определенной ролью
     */
    getUsersByRole: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { role } = ListByRoleSchema.parse({ role: req.params.role });

            const userIds = await rbacStorage.listUsersByRole(role);

            // Optionally fetch user details
            const users = await Promise.all(
                userIds.map(async (id) => {
                    const user = await usersStorage.getUserById(id);
                    return user
                        ? {
                              id: user.id,
                              firstName: user.firstName,
                              username: user.username,
                              telegramId: user.telegramId,
                          }
                        : null;
                }),
            );

            return res.json({
                success: true,
                role,
                users: users.filter((u) => u !== null),
            });
        }),
    ],

    /**
     * GET /api/admin/rbac/admins
     * Список всех администраторов (всех пользователей с любыми ролями)
     */
    listAllAdmins: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const admins = await rbacStorage.listAllAdmins();

            // Fetch user details for each admin
            const adminsWithDetails = await Promise.all(
                admins.map(async (admin) => {
                    const user = await usersStorage.getUserById(admin.userId);
                    return {
                        userId: admin.userId,
                        roles: admin.roles,
                        user: user
                            ? {
                                  firstName: user.firstName,
                                  username: user.username,
                                  telegramId: user.telegramId,
                              }
                            : null,
                    };
                }),
            );

            return res.json({
                success: true,
                admins: adminsWithDetails,
            });
        }),
    ],

    /**
     * GET /api/admin/rbac/roles
     * Список всех доступных ролей
     */
    listAvailableRoles: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const roles = [
                {
                    name: 'admin',
                    description: 'Full administrative access',
                },
                {
                    name: 'finance',
                    description: 'Financial operations and reports',
                },
                {
                    name: 'support',
                    description: 'Customer support and ticket management',
                },
                {
                    name: 'editor',
                    description: 'Content management and moderation',
                },
            ];

            return res.json({
                success: true,
                roles,
            });
        }),
    ],

    /**
     * POST /api/admin/rbac/check
     * Проверить, имеет ли пользователь определенную роль
     */
    checkUserRole: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId, role } = z
                .object({
                    userId: z.string().uuid(),
                    role: z.enum(['admin', 'finance', 'support', 'editor'] as const),
                })
                .parse(req.body);

            const hasRole = await rbacStorage.hasRole(userId, role);

            return res.json({
                success: true,
                userId,
                role,
                hasRole,
            });
        }),
    ],
};
