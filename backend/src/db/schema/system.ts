// backend/drizzle/schema/system.ts
import {
    pgTable, uuid, serial, integer, text, boolean, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol } from './_common';
import { appUser } from './users';
import { order } from './orders';

/**
 * Уведомления пользователю/по заказу.
 * Каналы/статусы — TEXT (валидируем в коде/RAW CHECK), чтобы не плодить enum.
 */
export const notification = pgTable('notification', {
    id: serial('id').primaryKey(),

    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').references(() => order.id, { onDelete: 'set null' }),

    eventType: text('event_type'),          // 'order_paid' | 'order_shipped' | ...
    channel:   text('channel'),             // 'telegram' | 'email'
    message:   text('message'),

    status: text('status').notNull().default('pending'), // 'pending' | 'sent' | 'failed'
    createdAt: createdAtCol(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
}, (t) => ({
    ixOrder:   index('ix_notification_order').on(t.orderId),
    ixUser:    index('ix_notification_user').on(t.userId),
    ixStatus:  index('ix_notification_status').on(t.status),
    ixChannel: index('ix_notification_channel').on(t.channel),
    ixCreated: index('ix_notification_created').on(t.createdAt),
}));

/**
 * Логи событий заказа (смена статусов/тех. события).
 * Отдельно от admin_audit_log: это операционные события самого заказа.
 */
export const orderLog = pgTable('order_log', {
    id: serial('id').primaryKey(),
    orderId: uuid('order_id').notNull().references(() => order.id, { onDelete: 'cascade' }),
    event: text('event'),                          // 'status:created→paid', 'delivery_label_printed', ...
    meta:  jsonb('meta'),                          // произвольный контекст события
    createdAt: createdAtCol(),
}, (t) => ({
    ixOrder: index('ix_order_log_order').on(t.orderId),
    ixTime:  index('ix_order_log_time').on(t.createdAt),
}));

/**
 * Логи активности пользователя (вход, изменение профиля, действия в кабинете).
 * Не путать с audit админа.
 */
export const userActivityLog = pgTable('user_activity_log', {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),              // 'login', 'profile_update', ...
    meta:   jsonb('meta'),
    createdAt: createdAtCol(),
}, (t) => ({
    ixUser: index('ix_user_activity_user').on(t.userId),
    ixTime: index('ix_user_activity_time').on(t.createdAt),
}));

/**
 * Analytics-теги. Инъекции скриптов по зонам ('site','admin','landing-xxx').
 * По умолчанию scopes = ['site'].
 */
export const analyticsTag = pgTable('analytics_tag', {
    id: serial('id').primaryKey(),
    name: text('name'),
    code: text('code'),          // legacy
    headCode: text('head_code'),
    bodyCode: text('body_code'),
    injectScopes: text('inject_scopes').array().notNull()
        .default(sql`ARRAY['site']::text[]`),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: createdAtCol(),
}, (t) => ({
    ixEnabled: index('ix_analytics_tag_enabled').on(t.enabled),
}));

// Типы
export type Notification     = typeof notification.$inferSelect;
export type NewNotification  = typeof notification.$inferInsert;

export type OrderLog         = typeof orderLog.$inferSelect;
export type NewOrderLog      = typeof orderLog.$inferInsert;

export type UserActivityLog  = typeof userActivityLog.$inferSelect;
export type NewUserActivityLog = typeof userActivityLog.$inferInsert;

export type AnalyticsTag     = typeof analyticsTag.$inferSelect;
export type NewAnalyticsTag  = typeof analyticsTag.$inferInsert;
