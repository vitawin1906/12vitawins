// backend/src/db/schema/promoCodes.ts
import {
    pgTable,
    uuid,
    text,
    numeric,
    boolean,
    timestamp,
    integer,
    index,
    uniqueIndex,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';

/**
 * Промокоды на уровне заказа (не product-specific)
 * Типы: percent_off (скидка %), fixed_amount (фиксированная сумма)
 */
export const promoCode = pgTable(
    'promo_code',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        code: text('code').notNull(), // уникальный код (например: WELCOME10)
        name: text('name').notNull(), // описание

        type: text('type').notNull(), // 'percent_off' | 'fixed_amount'

        // Значения скидки
        percentOff: numeric('percent_off', { precision: 5, scale: 2 }), // для type='percent_off'
        fixedAmountRub: numeric('fixed_amount_rub', { precision: 12, scale: 2 }), // для type='fixed_amount'

        // Минимальная сумма заказа для применения
        minOrderRub: numeric('min_order_rub', { precision: 12, scale: 2 }).default('0'),

        // Лимиты использования
        maxUses: integer('max_uses'), // NULL = unlimited
        currentUses: integer('current_uses').notNull().default(0),

        // Одноразовое использование на пользователя
        onePerUser: boolean('one_per_user').notNull().default(false),

        // Период действия
        isActive: boolean('is_active').notNull().default(true),
        startsAt: timestamp('starts_at', { withTimezone: true }),
        expiresAt: timestamp('expires_at', { withTimezone: true }),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uxCode: uniqueIndex('ux_promo_code_code').on(t.code),
        ixActive: index('ix_promo_code_active').on(t.isActive),
        ixExpiry: index('ix_promo_code_expiry').on(t.expiresAt),

        // CHECK constraints
        chkType: check('chk_promo_code_type', sql`${t.type} IN ('percent_off', 'fixed_amount')`),

        chkPercentRange: check(
            'chk_promo_code_percent_range',
            sql`${t.percentOff} IS NULL OR (${t.percentOff} >= 0 AND ${t.percentOff} <= 100)`
        ),

        chkFixedNonNeg: check(
            'chk_promo_code_fixed_nonneg',
            sql`${t.fixedAmountRub} IS NULL OR ${t.fixedAmountRub} >= 0`
        ),

        chkMinOrderNonNeg: check('chk_promo_code_min_order_nonneg', sql`${t.minOrderRub} >= 0`),

        chkUsesNonNeg: check(
            'chk_promo_code_uses_nonneg',
            sql`${t.maxUses} IS NULL OR ${t.maxUses} >= 0`
        ),

        chkCurrentUsesNonNeg: check('chk_promo_code_current_uses_nonneg', sql`${t.currentUses} >= 0`),
    })
);

/**
 * История использования промокодов
 */
export const promoCodeUsage = pgTable(
    'promo_code_usage',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        promoCodeId: uuid('promo_code_id')
            .notNull()
            .references(() => promoCode.id, { onDelete: 'cascade' }),

        userId: uuid('user_id').notNull(), // FK to app_user
        orderId: uuid('order_id').notNull(), // FK to order

        discountRub: numeric('discount_rub', { precision: 12, scale: 2 }).notNull(),

        createdAt: createdAtCol(),
    },
    (t) => ({
        ixPromoCode: index('ix_promo_code_usage_promo').on(t.promoCodeId),
        ixUser: index('ix_promo_code_usage_user').on(t.userId),
        ixOrder: index('ix_promo_code_usage_order').on(t.orderId),

        // Prevent duplicate usage in same order
        uxOrderPromo: uniqueIndex('ux_promo_code_usage_order_promo').on(t.orderId, t.promoCodeId),
    })
);

export type PromoCode = typeof promoCode.$inferSelect;
export type NewPromoCode = typeof promoCode.$inferInsert;

export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type NewPromoCodeUsage = typeof promoCodeUsage.$inferInsert;
