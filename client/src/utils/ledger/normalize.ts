/**
 * Ledger normalization utilities
 *
 * Backend отдаёт snake_case, но baseQuery автоматически преобразует в camelCase.
 * Эти утилиты:
 * 1. Нормализуют типы данных (string → number для balance)
 * 2. Обрабатывают edge cases (null, undefined)
 * 3. Форматируют суммы (NUMERIC приходит как string)
 */

import type {
  LedgerAccount,
  LedgerTransaction,
  LedgerPosting,
  LedgerPostingView,
} from '@/types/ledger';

/**
 * Логирование для отладки (только в dev)
 */
const DEBUG = import.meta.env.DEV;

function log(label: string, data: any) {
  if (DEBUG) {
    console.log(`[Ledger Normalize] ${label}:`, data);
  }
}

/* ======================== Account Normalization ======================== */

/**
 * Нормализует LedgerAccount с backend
 *
 * Backend возвращает:
 * - id, ownerType, ownerId, type, currency - уже camelCase через baseQuery
 * - balance - string (NUMERIC из БД: "1234.50")
 * - createdAt - ISO string
 *
 * Frontend использует:
 * - balance как string для точности (не конвертируем в number чтобы избежать потери точности)
 */
export function normalizeLedgerAccountFromApi(raw: any): LedgerAccount {
  if (!raw) {
    throw new Error('normalizeLedgerAccountFromApi: raw data is null/undefined');
  }

  log('RAW LedgerAccount from backend', raw);

  const normalized: LedgerAccount = {
    id: String(raw.id),
    ownerType: raw.ownerType || 'user',
    ownerId: raw.ownerId || null,
    type: raw.type,
    currency: raw.currency,
    // Balance остаётся string для точности (NUMERIC(12,2))
    balance: String(raw.balance || '0.00'),
    createdAt: raw.createdAt || new Date().toISOString(),
  };

  log('NORMALIZED LedgerAccount for frontend', normalized);

  return normalized;
}

/**
 * Нормализует массив счетов
 */
export function normalizeLedgerAccountsFromApi(rawArray: any[]): LedgerAccount[] {
  if (!Array.isArray(rawArray)) {
    console.warn('[normalizeAccounts] Expected array, got:', typeof rawArray);
    return [];
  }

  return rawArray
    .map((raw, index) => {
      try {
        return normalizeLedgerAccountFromApi(raw);
      } catch (error) {
        console.error(`[normalizeAccounts] Error at index ${index}:`, error, raw);
        return null;
      }
    })
    .filter((acc): acc is LedgerAccount => acc !== null);
}

/* ======================== Transaction Normalization ======================== */

/**
 * Нормализует LedgerTransaction с backend
 */
export function normalizeLedgerTransactionFromApi(raw: any): LedgerTransaction {
  if (!raw) {
    throw new Error('normalizeLedgerTransactionFromApi: raw data is null/undefined');
  }

  const normalized: LedgerTransaction = {
    id: String(raw.id),
    operationId: String(raw.operationId),
    opType: raw.opType,
    externalRef: raw.externalRef || null,
    userId: raw.userId || null,
    orderId: raw.orderId || null,
    level: raw.level != null ? Number(raw.level) : null,
    reversalOf: raw.reversalOf || null,
    meta: raw.meta || null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };

  return normalized;
}

/* ======================== Posting Normalization ======================== */

/**
 * Нормализует LedgerPosting с backend
 */
export function normalizeLedgerPostingFromApi(raw: any): LedgerPosting {
  if (!raw) {
    throw new Error('normalizeLedgerPostingFromApi: raw data is null/undefined');
  }

  const normalized: LedgerPosting = {
    id: String(raw.id),
    txnId: String(raw.txnId),
    debitAccountId: String(raw.debitAccountId),
    creditAccountId: String(raw.creditAccountId),
    // Amount остаётся string для точности
    amount: String(raw.amount || '0.00'),
    currency: raw.currency,
    memo: raw.memo || null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };

  return normalized;
}

/* ======================== PostingView Normalization ======================== */

/**
 * Нормализует LedgerPostingView с backend
 *
 * PostingView - объединённые данные posting + txn для UI:
 * - Содержит поля из обеих таблиц
 * - Используется в истории транзакций
 */
export function normalizeLedgerPostingViewFromApi(raw: any): LedgerPostingView {
  if (!raw) {
    throw new Error('normalizeLedgerPostingViewFromApi: raw data is null/undefined');
  }

  log('RAW PostingView from backend', raw);

  const normalized: LedgerPostingView = {
    id: String(raw.id),
    opType: raw.opType,
    currency: raw.currency,
    // Amount остаётся string для точности
    amount: String(raw.amount || '0.00'),
    createdAt: raw.createdAt || new Date().toISOString(),
    memo: raw.memo || null,
    operationId: raw.operationId || null,
    userId: raw.userId || null,
    orderId: raw.orderId || null,
    level: raw.level != null ? Number(raw.level) : null,
  };

  log('NORMALIZED PostingView for frontend', normalized);

  return normalized;
}

/**
 * Нормализует массив PostingView
 */
export function normalizeLedgerPostingViewsFromApi(rawArray: any[]): LedgerPostingView[] {
  if (!Array.isArray(rawArray)) {
    console.warn('[normalizePostingViews] Expected array, got:', typeof rawArray);
    return [];
  }

  return rawArray
    .map((raw, index) => {
      try {
        return normalizeLedgerPostingViewFromApi(raw);
      } catch (error) {
        console.error(`[normalizePostingViews] Error at index ${index}:`, error, raw);
        return null;
      }
    })
    .filter((view): view is LedgerPostingView => view !== null);
}

/* ======================== Formatting Utilities ======================== */

/**
 * Форматирует balance для отображения в UI
 *
 * @param balance - строка с балансом (NUMERIC из БД)
 * @param currency - валюта (RUB, VWC, PV)
 * @returns отформатированная строка с символом валюты
 */
export function formatBalance(balance: string, currency: 'RUB' | 'VWC' | 'PV'): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';

  switch (currency) {
    case 'RUB':
      return `${num.toFixed(2)} ₽`;
    case 'VWC':
      return `${num.toFixed(2)} VWC`;
    case 'PV':
      return `${num.toFixed(0)} PV`;
    default:
      return balance;
  }
}

/**
 * Форматирует amount транзакции для отображения
 */
export function formatAmount(amount: string, currency: 'RUB' | 'VWC' | 'PV'): string {
  return formatBalance(amount, currency);
}

/**
 * Парсит balance string → number
 * Используется только для вычислений, не для хранения!
 */
export function parseBalance(balance: string): number {
  const num = parseFloat(balance);
  return isNaN(num) ? 0 : num;
}

/**
 * Получает человекочитаемое название типа операции
 */
export function getOpTypeName(opType: string): string {
  const names: Record<string, string> = {
    order_accrual: 'Начисление за заказ',
    order_payment: 'Оплата заказа',
    refund: 'Возврат',
    reward: 'Вознаграждение',
    transfer: 'Перевод',
    fast_start: 'Fast Start бонус',
    infinity: 'Infinity бонус',
    option_bonus: 'Опциональный бонус',
    activation_bonus: 'Активационный бонус',
    first_pool: 'Первый пул',
    airdrop: 'Airdrop',
    achievement: 'Достижение',
    adjustment: 'Корректировка',
    withdrawal_request: 'Заявка на вывод',
    withdrawal_payout: 'Выплата',
  };

  return names[opType] || opType;
}

/**
 * Получает цвет для типа операции (для UI)
 */
export function getOpTypeColor(opType: string): 'green' | 'red' | 'blue' | 'gray' {
  // Зелёный - начисления
  if (
    opType.includes('accrual') ||
    opType.includes('bonus') ||
    opType.includes('reward') ||
    opType.includes('airdrop')
  ) {
    return 'green';
  }

  // Красный - списания
  if (opType.includes('payment') || opType.includes('payout') || opType.includes('withdrawal')) {
    return 'red';
  }

  // Синий - возвраты и трансферы
  if (opType.includes('refund') || opType.includes('transfer')) {
    return 'blue';
  }

  return 'gray';
}

/**
 * Получает человекочитаемое название типа счёта
 */
export function getAccountTypeName(type: string): string {
  const names: Record<string, string> = {
    cash_rub: 'Рублёвый счёт',
    pv: 'PV (Личный объём)',
    vwc: 'VWC (VitaWin Coin)',
    referral: 'Реферальный счёт',
    reserve_special: 'Специальный резерв',
    network_fund: 'Фонд сети',
  };

  return names[type] || type;
}
