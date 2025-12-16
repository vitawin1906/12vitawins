import { pgTable, uuid, text, integer, numeric, boolean, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { order } from './orders';
import { product } from './products'; // ← добавляем импорт, это безопасно

export const orderItem = pgTable(
    'order_item',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        orderId: uuid('order_id')
            .notNull()
            .references(() => order.id, { onDelete: 'cascade' }),

        productId: uuid('product_id')
            .notNull()
            .references(() => product.id, { onDelete: 'restrict' }),

        productName: text('product_name').notNull(),
        productSlug: text('product_slug'),
        imageUrl: text('image_url'),
        categoryId: uuid('category_id'),
        sku: text('sku'),

        qty: integer('qty').notNull(),
        unitPriceRub: numeric('unit_price_rub', { precision: 12, scale: 2 }).notNull(),
        lineSubtotalRub: numeric('line_subtotal_rub', { precision: 12, scale: 2 }).notNull(),
        lineDiscountRub: numeric('line_discount_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        lineTotalRub: numeric('line_total_rub', { precision: 12, scale: 2 }).notNull(),

        isPvEligible: boolean('is_pv_eligible').notNull().default(true),
        isFree: boolean('is_free').notNull().default(false),
        pvEach: integer('pv_each').notNull().default(0),
        pvTotal: integer('pv_total').notNull().default(0),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        // бизнес-правила
        chkQty: check('chk_order_item_qty', sql`${t.qty} > 0`),
        chkUnitPrice: check('chk_order_item_unit_price', sql`${t.unitPriceRub} >= 0`),
        chkPvEach: check('chk_order_item_pv_each', sql`${t.pvEach} >= 0`),

        // Индексы
        ixOrder: index('ix_order_item_order').on(t.orderId),
        ixProduct: index('ix_order_item_product').on(t.productId),

        // ✅ FIX-2: Unique constraint - один товар один раз в заказе
        uqOrderProduct: index('uq_order_item_order_product').on(t.orderId, t.productId),
    })
);

export type OrderItem = typeof orderItem.$inferSelect;
