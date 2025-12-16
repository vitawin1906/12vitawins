// backend/drizzle/schema/withdrawalRequest.ts
import {
    pgTable,
    uuid,
    numeric,
    jsonb,
    timestamp,
    index,
    check,
} from 'drizzle-orm/pg-core';

import { appUser } from './users';
import { paymentMethodEnum, withdrawalStatusEnum } from './enums';
import { createdAtCol, updatedAtCol } from './_common';
import {sql} from "drizzle-orm";

export const withdrawalRequest = pgTable(
    'withdrawal_request',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        // FK → обязательный
        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        // сумма вывода
        amountRub: numeric('amount_rub', { precision: 12, scale: 2 }).notNull(),

        // ENUM — корректно
        status: withdrawalStatusEnum('status').notNull(),

        // ENUM — корректно
        method: paymentMethodEnum('method').notNull(),

        // реквизиты/кошелёк/банковские данные
        payload: jsonb('payload').$type<Record<string, any> | null>(),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        ixUser: index('ix_withdrawal_user').on(t.userId),
        ixStatus: index('ix_withdrawal_status').on(t.status),
        chkAmount: check('chk_withdrawal_amount_pos', sql`${t.amountRub} > 0`)
    })
);

export type WithdrawalRequest = typeof withdrawalRequest.$inferSelect;
export type NewWithdrawalRequest = typeof withdrawalRequest.$inferInsert;
