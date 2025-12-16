// backend/drizzle/schema/promotions.ts
import {
    pgTable, serial, uuid, text, boolean, timestamp, integer, numeric,
    index, primaryKey, check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { product } from './products';

export const promotion = pgTable('promotion', {
    id: serial('id').primaryKey(),

    name: text('name').notNull(),
    kind: text('kind').notNull(), // 'buy_x_get_y' | 'percent_off' | 'fixed_price' | ...

    isActive: boolean('is_active').notNull().default(true),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt:   timestamp('ends_at',   { withTimezone: true }),

    // Параметры (используются в зависимости от kind)
    buyQty:        integer('buy_qty'),                                  // для buy_x_get_y
    getQty:        integer('get_qty'),
    percentOff:    numeric('percent_off', { precision: 5,  scale: 2 }), // для percent_off
    fixedPriceRub: numeric('fixed_price_rub', { precision: 12, scale: 2 }), // для fixed_price
}, (t) => ({
    ixActiveTime: index('ix_promo_active_time').on(t.isActive, t.startsAt, t.endsAt),

    // 0..100 для процентов
    chkPercentRange: check(
        'chk_promo_percent_range',
        sql`${t.percentOff} IS NULL OR (${t.percentOff} >= 0 AND ${t.percentOff} <= 100)`
    ),

    // buy/get либо оба NULL, либо оба > 0
    chkBuyGetPositive: check(
        'chk_promo_buy_get_positive',
        sql`(${t.buyQty} IS NULL AND ${t.getQty} IS NULL)
            OR (${t.buyQty} IS NOT NULL AND ${t.buyQty} > 0 AND ${t.getQty} IS NOT NULL AND ${t.getQty} > 0)`
    ),

    // fixed_price_rub неотрицательная (если указана)
    chkFixedPriceNonNeg: check(
        'chk_promo_fixed_price_nonneg',
        sql`${t.fixedPriceRub} IS NULL OR ${t.fixedPriceRub} >= 0`
    ),

    // Если обе даты заданы — период валиден
    chkPeriodOrder: check(
        'chk_promo_period_order',
        sql`(${t.startsAt} IS NULL OR ${t.endsAt} IS NULL) OR (${t.endsAt} > ${t.startsAt})`
    ),
}));

export const promotionProduct = pgTable('promotion_product', {
    promotionId: integer('promotion_id')
        .notNull()
        .references(() => promotion.id, { onDelete: 'cascade' }),

    // продукт — UUID (см. products.ts)
    productId: uuid('product_id')
        .notNull()
        .references(() => product.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ name: 'pk_promotion_product', columns: [t.promotionId, t.productId] }),
    ixPromotion: index('ix_promo_product_promotion').on(t.promotionId),
    ixProduct:   index('ix_promo_product_product').on(t.productId),
}));

export type Promotion = typeof promotion.$inferSelect;
export type NewPromotion = typeof promotion.$inferInsert;

export type PromotionProduct = typeof promotionProduct.$inferSelect;
export type NewPromotionProduct = typeof promotionProduct.$inferInsert;
