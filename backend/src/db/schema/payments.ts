// backend/drizzle/schema/payments.ts
import {
    pgTable, uuid, text, timestamp, numeric, index, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { order } from './orders';
import { createdAtCol, updatedAtCol } from './_common';
import { currencyEnum, paymentMethodEnum, paymentStatusEnum } from './enums';

export const payment = pgTable('payment', {
    id: uuid('id').primaryKey().defaultRandom(),

    orderId: uuid('order_id').notNull().references(() => order.id, { onDelete: 'cascade' }),

    method: paymentMethodEnum('method').notNull(),       // 'card' | 'vwc'
    status: paymentStatusEnum('status').notNull(),

    amountRub: numeric('amount_rub', { precision: 12, scale: 2 }).notNull(),
    currency:  currencyEnum('currency').notNull().default('RUB'),

    externalId:   text('external_id'),
    errorCode:    text('error_code'),
    errorMessage: text('error_message'),

    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    capturedAt:   timestamp('captured_at',   { withTimezone: true }),
    refundedAt:   timestamp('refunded_at',   { withTimezone: true }),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    ixOrder:  index('ix_payment_order').on(t.orderId),
    ixStatus: index('ix_payment_status').on(t.status),

    // Провайдер шлёт один и тот же external_id при ретраях — делаем его уникальным (кроме NULL)
    uxExternal: uniqueIndex('ux_payment_external_id')
        .on(t.externalId)
        .where(sql`${t.externalId} IS NOT NULL`),

    // Сумма должна быть > 0
    chkAmountPositive: check('chk_payment_amount_positive', sql`${t.amountRub} > 0`),

    // Фиксируем, что платёж хранится в рублях (согласовано с orders.*Rub полями)
    chkCurrencyRubOnly: check('chk_payment_currency_rub', sql`${t.currency} = 'RUB'`),
}));

export type Payment    = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;
