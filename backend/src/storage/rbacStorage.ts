// src/storage/rbacStorage.ts
import { and, eq, sql } from 'drizzle-orm';
import { db } from '#db/db';
import { adminUserRole, type AdminUserRole } from '#db/schema/rbac';
import { rbacRoleEnum } from '#db/schema/enums';

const ROLE_SET = new Set(rbacRoleEnum.enumValues);
export type RbacRole = (typeof rbacRoleEnum.enumValues)[number];

function assertRole(r: string) {
    if (!ROLE_SET.has(r as RbacRole)) throw new Error(`Invalid role: ${r}`);
}

export const rbacStorage = {
    // User-Role mapping
    async assignRole(userId: string, role: RbacRole): Promise<AdminUserRole> {
        assertRole(role);
        const [row] = await db
            .insert(adminUserRole)
            .values({ userId, role })
            .onConflictDoNothing({ target: [adminUserRole.userId, adminUserRole.role] })
            .returning();
        // идемпотентность: если был дубль, returning вернёт пусто → достанем существующую
        if (row) return row;
        const [existing] = await db
            .select()
            .from(adminUserRole)
            .where(and(eq(adminUserRole.userId, userId), eq(adminUserRole.role, role)))
            .limit(1);
        return existing!;
    },

    async revokeRole(userId: string, role: RbacRole): Promise<boolean> {
        assertRole(role);
        const res = await db
            .delete(adminUserRole)
            .where(and(eq(adminUserRole.userId, userId), eq(adminUserRole.role, role)))
            .returning({ userId: adminUserRole.userId });
        return res.length > 0;
    },

    async getUserRoles(userId: string): Promise<AdminUserRole[]> {
        return db.select().from(adminUserRole).where(eq(adminUserRole.userId, userId));
    },

    async hasRole(userId: string, role: RbacRole): Promise<boolean> {
        assertRole(role);
        const [row] = await db
            .select({ cnt: sql<number>`count(*)::int` })
            .from(adminUserRole)
            .where(and(eq(adminUserRole.userId, userId), eq(adminUserRole.role, role)));
        return (row?.cnt ?? 0) > 0;
    },

    // Списки
    async listUsersByRole(role: RbacRole): Promise<string[]> {
        assertRole(role);
        const rows = await db
            .select({ userId: adminUserRole.userId })
            .from(adminUserRole)
            .where(eq(adminUserRole.role, role));
        return rows.map((r) => r.userId);
    },

    async listAllAdmins(): Promise<Array<{ userId: string; roles: string[] }>> {
        const rows = await db
            .select()
            .from(adminUserRole);
        const map = new Map<string, Set<string>>();
        for (const r of rows) {
            if (!map.has(r.userId)) map.set(r.userId, new Set());
            map.get(r.userId)!.add(r.role as string);
        }
        return [...map.entries()].map(([userId, roles]) => ({ userId, roles: [...roles] }));
    },
};
