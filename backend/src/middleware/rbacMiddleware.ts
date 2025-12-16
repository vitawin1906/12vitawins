// backend/src/middleware/rbacMiddleware.ts
import type { Request, Response, NextFunction } from 'express';
import { rbacStorage } from '#storage/rbacStorage';
import {z} from "zod";

export const RoleSchema = z.enum(['admin','finance','support','editor'] as const);
export type RoleName = z.infer<typeof RoleSchema>;

export function requireRole(roles: string | string[]) {
    // ⬇️ приводим вход к узкому типу RoleName
    const required: RoleName[] = (Array.isArray(roles) ? roles : [roles]).map((r) => RoleSchema.parse(r));

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const userRoles = await rbacStorage.getUserRoles(userId);
            // ⬇️ приводим роли из стораджа к RoleName
            const roleNames: RoleName[] = userRoles.map((r: any) => RoleSchema.parse(r.role));
            const roleSet = new Set<RoleName>(roleNames);

            const hasAccess = required.some((r) => roleSet.has(r)); // ✅ типобезопасно
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Required role: ${required.join(' or ')}`,
                });
            }

            next();
        } catch (error) {
            console.error('RBAC middleware error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}

export const requireAdmin = requireRole('admin');

export function requirePermission(_permission: string) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    // TODO: implement if permissions table appears
    next();
  };
}
