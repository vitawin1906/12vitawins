// backend/drizzle/schema/orders.ts
import {
    pgTable,
    uuid,
    numeric,
    integer,
    timestamp,
    index,
    boolean,
    text,
    check,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';
import { appUser } from './users';
import { orderStatusEnum, deliveryStatusEnum, paymentMethodEnum } from './enums';
import { createdAtCol, updatedAtCol } from './_common';

export const order = pgTable(
    'order',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        // Статусы
        status: orderStatusEnum('status').notNull().default('pending'),
        deliveryStatus: deliveryStatusEnum('delivery_status')
            .notNull()
            .default('not_required'),

        /* Totals used by recalc */
        itemsSubtotalRub: numeric('items_subtotal_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        discountTotalRub: numeric('discount_total_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        orderBaseRub: numeric('order_base_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        totalPayableRub: numeric('total_payable_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),

        /* PV / funds */
        pvEarned: integer('pv_earned').notNull().default(0),
        vwcCashback: numeric('vwc_cashback', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        networkFundRub: numeric('network_fund_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),

        // ✅ ЭТАП 2.3: Total bonuses granted (L1-L15 + Fast Start + Infinity)
        bonusesGrantedRub: numeric('bonuses_granted_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),

        /* Payment & Promo */
        paymentMethod: paymentMethodEnum('payment_method'), // enum
        promoCode: text('promo_code'),
        promoDiscountRub: numeric('promo_discount_rub', {
            precision: 12,
            scale: 2,
        })
            .notNull()
            .default('0'),

        // ✅ FIX-2: Referral discount (10% от subtotal, max 1000 RUB)
        referralDiscountRub: numeric('referral_discount_rub', {
            precision: 12,
            scale: 2,
        })
            .notNull()
            .default('0'),
        referralUserId: uuid('referral_user_id').references(() => appUser.id),

        /* Customer notes */
        comment: text('comment'),

        /* Delivery */
        deliveryRequired: boolean('delivery_required')
            .notNull()
            .default(false),
        deliveryService: text('delivery_service'),
        deliveryFeeRub: numeric('delivery_fee_rub', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        deliveryAddress: text('delivery_address'),
        deliveryTrackingCode: text('delivery_tracking_code'),

        deliveredAt: timestamp('delivered_at', { withTimezone: true }),

        // ✅ Idempotency key для предотвращения дублирования заказов
        idempotencyKey: text('idempotency_key'),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        // 🔥 CHECK-инварианты суммы заказа
        chkSubtotal: check(
            'chk_order_subtotal',
            sql`${t.itemsSubtotalRub} >= 0`
        ),

        chkDiscount: check(
            'chk_order_discount',
            sql`${t.discountTotalRub} >= 0`
        ),

        chkBase: check(
            'chk_order_base',
            sql`${t.orderBaseRub} >= 0`
        ),

        chkTotal: check(
            'chk_order_total',
            sql`${t.totalPayableRub} >= 0`
        ),

        chkPv: check(
            'chk_order_pv_earned',
            sql`${t.pvEarned} >= 0`
        ),

        chkPromoDiscount: check(
            'chk_promo_discount_nonneg',
            sql`${t.promoDiscountRub} >= 0`
        ),

        chkDeliveryFee: check(
            'chk_delivery_fee_nonneg',
            sql`${t.deliveryFeeRub} >= 0`
        ),

        // ✅ FIX-2: Check для referral discount
        chkReferralDiscount: check(
            'chk_referral_discount_nonneg',
            sql`${t.referralDiscountRub} >= 0`
        ),

        // Индексы
        ixOrderUser: index('ix_order_user').on(t.userId),
        ixOrderDeliveredAt: index('ix_order_delivered_at').on(t.deliveredAt),
        ixOrderCreatedAt: index('ix_order_created_at').on(t.createdAt),
        ixOrderIdempotencyKey: index('ix_order_idempotency_key').on(t.idempotencyKey),
        // ✅ FIX-2: Индекс для быстрого поиска по referrer
        ixOrderReferralUser: index('ix_order_referral_user').on(t.referralUserId),
    })
);

export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
