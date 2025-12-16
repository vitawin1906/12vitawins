// backend/drizzle/schema/ledger.ts
import {
  pgTable, uuid, text, numeric, timestamp, jsonb, index, uniqueIndex, check, integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol } from './_common';
import {
  accountTypeEnum,
  currencyEnum,
  ledgerOpTypeEnum,
  ownerTypeEnum,
} from './enums';
import { appUser } from './users';

/**
 * Счёт (ledger_account)
 * Уникальность по владельцу/типу/валюте. Для system owner_id = NULL.
 */
export const ledgerAccount = pgTable('ledger_account', {
  id: uuid('id').primaryKey().defaultRandom(),

  ownerType: ownerTypeEnum('owner_type').notNull(),                 // 'user' | 'system'
  ownerId:   uuid('owner_id').references(() => appUser.id, {        // NULL для system, FK для user
    onDelete: 'set null',
  }),

  type:     accountTypeEnum('type').notNull(),                      // 'cash_rub' | 'pv' | 'vwc' | 'referral' | ...
  currency: currencyEnum('currency').notNull(),                     // RUB | VWC | PV

  createdAt: createdAtCol(),
}, (t) => ({
  uxOwnerTypeKind: uniqueIndex('ux_ledger_account_owner_kind')
      .on(t.ownerType, t.ownerId, t.type, t.currency),

  ixOwner: index('ix_ledger_account_owner').on(t.ownerType, t.ownerId),
  ixType:  index('ix_ledger_account_type').on(t.type),
  ixCurr:  index('ix_ledger_account_currency').on(t.currency),
}));

/**
 * Транзакция (ledger_txn)
 * Идемпотентность: operation_id UNIQUE.
 * Можно ссылаться на пользователя/заказ (опц.), на уровень (1..15) для сетевого начисления.
 */
export const ledgerTxn = pgTable('ledger_txn', {
  id: uuid('id').primaryKey().defaultRandom(),

  operationId: uuid('operation_id').notNull(),                      // ключ идемпотентности
  opType:      ledgerOpTypeEnum('op_type').notNull(),               // order_accrual/refund/...

  externalRef: text('external_ref'),                                // внешние ID (вебхуки/платёжки)

  userId:  uuid('user_id').references(() => appUser.id, { onDelete: 'set null' }),
  orderId: uuid('order_id'),                                        // без FK (не блокируем сторно после purge)

  level: integer('level'),                                          // 1..15

  reversalOf: uuid('reversal_of'),                                  // operation_id исходной
  meta:       jsonb('meta'),                                        // произвольная мета

  // ✅ Поля для reversal logic
  reversedAt: timestamp('reversed_at', { withTimezone: true }),     // когда транзакция была отменена
  reversalTxnId: uuid('reversal_txn_id'),                           // ID reversal транзакции

  createdAt: createdAtCol(),
}, (t) => ({
  uxOperation: uniqueIndex('ux_ledger_txn_operation').on(t.operationId),

  ixUser:     index('ix_ledger_txn_user').on(t.userId),
  ixOrder:    index('ix_ledger_txn_order').on(t.orderId),
  ixType:     index('ix_ledger_txn_type').on(t.opType),
  ixReversal: index('ix_ledger_txn_reversal').on(t.reversalOf),
  ixReversalTxn: index('ix_ledger_txn_reversal_txn').on(t.reversalTxnId),
  ixCreated:  index('ix_ledger_txn_created').on(t.createdAt),

  chkLevelRange: check('chk_ledger_txn_level_range',
      sql`(${t.level} IS NULL) OR (${t.level} BETWEEN 1 AND 15)`),
}));

/**
 * Проводка (ledger_posting) — двойная запись.
 * CHECK: дебетовый и кредитовый счёт различны; сумма > 0.
 * Инвариант «сумма проводок по txn и валюте = 0» проверяем в сервисе (и юнит-тестами).
 */
export const ledgerPosting = pgTable('ledger_posting', {
  id: uuid('id').primaryKey().defaultRandom(),

  txnId: uuid('txn_id').notNull().references(() => ledgerTxn.id, { onDelete: 'cascade' }),

  debitAccountId:  uuid('debit_account_id').notNull().references(() => ledgerAccount.id),
  creditAccountId: uuid('credit_account_id').notNull().references(() => ledgerAccount.id),

  amount:   numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum('currency').notNull(),

  memo: text('memo'),

  createdAt: createdAtCol(),
}, (t) => ({
  ixTxn:    index('ix_posting_txn').on(t.txnId),
  ixDebit:  index('ix_posting_debit').on(t.debitAccountId),
  ixCredit: index('ix_posting_credit').on(t.creditAccountId),
  ixCurr:   index('ix_posting_currency').on(t.currency),

  chkAccountsDistinct: check('chk_posting_accounts_distinct',
      sql`${t.debitAccountId} <> ${t.creditAccountId}`),
  chkAmountPositive:   check('chk_posting_amount_positive',
      sql`${t.amount} > 0`),
}));

// Типы
export type LedgerAccount     = typeof ledgerAccount.$inferSelect;
export type NewLedgerAccount  = typeof ledgerAccount.$inferInsert;

export type LedgerTxn         = typeof ledgerTxn.$inferSelect;
export type NewLedgerTxn      = typeof ledgerTxn.$inferInsert;

export type LedgerPosting     = typeof ledgerPosting.$inferSelect;
export type NewLedgerPosting  = typeof ledgerPosting.$inferInsert;

