// backend/drizzle/schema/settings.ts
import { pgTable, uuid, text, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAtCol, updatedAtCol } from './_common';
import { appUser } from './users';

/**
 * Версионируемые глобальные настройки (key/value JSONB).
 * Активная версия выбирается как max(effective_from) <= now() по ключу.
 * Матрицы уровней НЕ храним здесь — для этого есть levels_matrix_versions.
 */
export const settings = pgTable('settings', {
    id: uuid('id').primaryKey().defaultRandom(),

    key:         text('key').notNull(),
    valueJson:   jsonb('value_json').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    ixKey:          index('ix_settings_key').on(t.key),
    ixKeyEffective: index('ix_settings_key_effective').on(t.key, t.effectiveFrom),
    // предотвращаем дубликаты одной и той же версии по ключу
    uxKeyEffective: uniqueIndex('ux_settings_key_effective').on(t.key, t.effectiveFrom),
}));

/**
 * Аудит админ-действий (RBAC).
 * UUID PK, FK → app_user.id, плюс fallback по who_telegram_id (TEXT).
 * old/new → old_value/new_value (без конфликтов с ключевыми словами).
 */
export const adminAuditLog = pgTable('admin_audit_log', {
    id: uuid('id').primaryKey().defaultRandom(),

    whoUserId: uuid('who_user_id').references(() => appUser.id, { onDelete: 'set null' }),
    whoTelegramId: text('who_telegram_id'),

    scope:  text('scope').notNull(),   // 'users'|'orders'|'matrix'|'freedom'|'option'|'withdrawals'|...
    action: text('action').notNull(),  // 'create'|'update'|'delete'|'approve'|'reject'|'recalc'|...

    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),

    createdAt: createdAtCol(),
}, (t) => ({
    ixWhoUser:     index('ix_admin_audit_who_user').on(t.whoUserId),
    ixWhoTg:       index('ix_admin_audit_who_tg').on(t.whoTelegramId),
    ixScopeTime:   index('ix_admin_audit_scope_time').on(t.scope, t.createdAt),
    ixScopeAction: index('ix_admin_audit_scope_action').on(t.scope, t.action),
}));

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
