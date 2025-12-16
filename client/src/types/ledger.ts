// client/src/types/ledger.ts

/**
 * Ledger Types
 * Соответствуют backend/src/db/schema/ledger.ts
 */

/* ======================== Enums ======================== */

export type Currency = 'RUB' | 'VWC' | 'PV';

export type AccountType =
  | 'cash_rub'
  | 'pv'
  | 'vwc'
  | 'referral'
  | 'reserve_special'
  | 'network_fund';

export type OwnerType = 'user' | 'system';

export type LedgerOpType =
  | 'order_accrual'
  | 'order_payment'
  | 'refund'
  | 'reward'
  | 'transfer'
  | 'fast_start'
  | 'infinity'
  | 'option_bonus'
  | 'activation_bonus'
  | 'first_pool'
  | 'airdrop'
  | 'achievement'
  | 'adjustment'
  | 'withdrawal_request'
  | 'withdrawal_payout';

/* ======================== Interfaces ======================== */

/**
 * Ledger Account (Счёт пользователя)
 * Уникальность: ownerType + ownerId + type + currency
 */
export interface LedgerAccount {
  id: string;
  ownerType: OwnerType;
  ownerId?: string | null; // NULL для system accounts
  type: AccountType;
  currency: Currency;
  balance: string; // Возвращается как string с backend (NUMERIC)
  createdAt: string;
}

/**
 * Ledger Transaction (Транзакция)
 * Идемпотентность через operationId (UNIQUE)
 */
export interface LedgerTransaction {
  id: string;
  operationId: string;
  opType: LedgerOpType;
  externalRef?: string | null;
  userId?: string | null;
  orderId?: string | null;
  level?: number | null; // 1..15 для MLM начислений
  reversalOf?: string | null; // operationId исходной транзакции при отмене
  meta?: Record<string, any> | null;
  createdAt: string;
}

/**
 * Ledger Posting (Проводка - двойная запись)
 * Каждая транзакция состоит из 1+ проводок
 */
export interface LedgerPosting {
  id: string;
  txnId: string; // FK → ledger_txn.id
  debitAccountId: string; // счёт дебета
  creditAccountId: string; // счёт кредита
  amount: string; // NUMERIC (> 0)
  currency: Currency;
  memo?: string | null;
  createdAt: string;
}

/**
 * LedgerPostingView - объединённый view для контроллеров
 * Содержит данные posting + txn для отображения в UI
 */
export interface LedgerPostingView {
  id: string; // posting.id
  opType: LedgerOpType; // txn.opType
  currency: Currency;
  amount: string; // posting.amount
  createdAt: string;
  memo?: string | null;
  operationId?: string | null; // txn.operationId
  userId?: string | null; // txn.userId
  orderId?: string | null; // txn.orderId
  level?: number | null; // txn.level
}

/* ======================== Response Types ======================== */

export interface LedgerAccountsResponse {
  success: boolean;
  accounts: LedgerAccount[];
}

export interface LedgerAccountResponse {
  success: boolean;
  account: LedgerAccount;
}

export interface LedgerTransactionsResponse {
  success: boolean;
  transactions: LedgerPostingView[];
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface AdminLedgerTransactionsResponse {
  success: boolean;
  items: LedgerPostingView[];
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface AdminLedgerAccountsResponse {
  success: boolean;
  accounts: LedgerAccount[];
  pagination?: {
    limit: number;
    offset: number;
  };
}

/* ======================== Query Params ======================== */

export interface LedgerTransactionsQuery {
  limit?: number;
  offset?: number;
}

export interface LedgerBalanceQuery {
  currency: Currency;
  type: AccountType;
}
