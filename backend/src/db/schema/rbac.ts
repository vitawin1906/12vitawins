// backend/drizzle/schema/rbac.ts
import { pgTable, uuid, index, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { rbacRoleEnum } from './enums';
import { appUser } from './users';

export const adminUserRole = pgTable('admin_user_role', {
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    role:   rbacRoleEnum('role').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(), // необязательный, но полезный
}, (t) => ({
    pk: primaryKey({ name: 'pk_admin_user_role', columns: [t.userId, t.role] }),
    ixRole: index('ix_admin_user_role_role').on(t.role),
}));

export type AdminUserRole = typeof adminUserRole.$inferSelect;
export type NewAdminUserRole = typeof adminUserRole.$inferInsert;
