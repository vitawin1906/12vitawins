// backend/drizzle/schema/integrations.ts
import { pgTable, serial, text, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { deliveryServiceEnum } from './enums';

export const integrationsConfig = pgTable('integrations_config', {
    id: serial('id').primaryKey(),

    // Платёжка
    paymentsWebhookSecret: text('payments_webhook_secret'),
    paymentsIdempotencyHeader: text('payments_idempotency_header'),

    // Доставка (enum[] гарантирует корректные значения)
    deliveryProviders: deliveryServiceEnum('delivery_providers').array(),
    tariffCacheTtlMinutes: integer('tariff_cache_ttl_minutes'),

    // Telegram
    telegramBotToken: text('telegram_bot_token'),
    telegramWebhookUrl: text('telegram_webhook_url'),
    tgLinkTtlSec: integer('tg_link_ttl_sec'),

    // Версионирование: одна активная запись
    isActive: boolean('is_active').notNull().default(true),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    // Только одна активная конфигурация
    uxActive: uniqueIndex('ux_integrations_config_active')
        .on(t.isActive)
        .where(sql`${t.isActive} = true`),

    ixWebhook: index('ix_integrations_webhook').on(t.telegramWebhookUrl),
}));

export type IntegrationsConfig = typeof integrationsConfig.$inferSelect;
export type NewIntegrationsConfig = typeof integrationsConfig.$inferInsert;
