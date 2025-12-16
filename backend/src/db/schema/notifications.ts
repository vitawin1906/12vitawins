// backend/drizzle/schema/notifications.ts
import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    jsonb,
    index,
    serial,
} from 'drizzle-orm/pg-core';

import { createdAtCol } from './_common';
import {
    notificationChannelEnum,
    notificationStatusEnum,
    notificationEventEnum, deliveryStatusEnum,
} from './enums';

import { appUser } from './users';
import { order } from './orders';

/**
 * Уведомления:
 * - канал (email/telegram/push)
 * - событие (order_paid / withdrawal_approved и т.д.)
 * - статус отправки (pending/sent/failed)
 * - связка с юзером и заказом
 */
export const notification = pgTable(
    'notification',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        /** пользователь, кому отправлено */
        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        /** заказ, к которому относится событие (опционально) */
        orderId: uuid('order_id').references(() => order.id, { onDelete: 'cascade' }),

        /** Канал доставки: email / telegram / push */
        channel: notificationChannelEnum('channel').notNull(),

        /** Тип события: order_created / withdrawal_requested / airdrop_completed */
        eventType: notificationEventEnum('event_type').notNull(),

        /** Статус отправки: pending / sent / failed */
        status: notificationStatusEnum('status').notNull().default('pending'),

        /** Сообщение (рендер результата, текст, JSON) */
        payload: jsonb('payload'),

        /** Ошибка отправки (если есть) */
        error: text('error'),

        createdAt: createdAtCol(),
        sentAt: timestamp('sent_at', { withTimezone: true }),
    },
    (t) => ({
        ixUser: index('ix_notification_user').on(t.userId),
        ixOrder: index('ix_notification_order').on(t.orderId),
        ixChannel: index('ix_notification_channel').on(t.channel),
        ixEvent: index('ix_notification_event').on(t.eventType),
        ixStatus: index('ix_notification_status').on(t.status),
        ixCreated: index('ix_notification_created').on(t.createdAt),
    })
);
// ─────────────────────────────────────────────
// Delivery Event — история статусов доставки
// ─────────────────────────────────────────────

export const deliveryEvent = pgTable(
    'delivery_event',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        orderId: uuid('order_id')
            .notNull()
            .references(() => order.id, { onDelete: 'cascade' }),

        /** Логистический провайдер: sdek / russianpost / yandex / null */
        provider: text('provider'),

        /** Наш внутренний статус доставки */
        status: deliveryStatusEnum('status').notNull(),

        /** Статус, который приходит от API курьера (если есть) */
        providerStatus: text('provider_status'),

        /** Любые дополнительные данные */
        payload: jsonb('payload'),

        createdAt: timestamp('created_at', { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => ({
        ixOrder: index('ix_delivery_event_order').on(t.orderId),
        ixStatus: index('ix_delivery_event_status').on(t.status),
        ixProvider: index('ix_delivery_event_provider').on(t.provider),
        ixCreated: index('ix_delivery_event_created').on(t.createdAt),
    })
);

export type DeliveryEvent = typeof deliveryEvent.$inferSelect;
export type NewDeliveryEvent = typeof deliveryEvent.$inferInsert;

export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;
