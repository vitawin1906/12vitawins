import { baseApi } from '../baseApi';
import type {
  LedgerAccount,
  LedgerAccountsResponse,
  LedgerAccountResponse,
  LedgerTransactionsResponse,
  LedgerTransactionsQuery,
  LedgerBalanceQuery,
  LedgerPostingView,
  AdminLedgerTransactionsResponse,
  AdminLedgerAccountsResponse,
} from '@/types/ledger';

/* ======================== API ======================== */

/**
 * Ledger API
 *
 * Работает с системой двойной записи (ledger):
 * - Счета пользователей (cash_rub, pv, vwc)
 * - Транзакции и проводки
 * - История операций (заказы, бонусы, выводы)
 *
 * Backend использует систему двойной записи:
 * - LedgerAccount - счета (уникальны по owner+type+currency)
 * - LedgerTxn - транзакции (идемпотентность через operationId)
 * - LedgerPosting - проводки (дебет/кредит, сумма > 0)
 */
export const ledgerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── User Ledger Queries ─────────── */

    /**
     * GET /api/ledger/my-accounts
     * Получить все мои счета (cash_rub, vwc, pv) с балансами
     *
     * Backend автоматически создаёт счета через ensureAccount если их нет.
     * Возвращает массив из 3 счетов: RUB, VWC, PV.
     */
    getMyAccounts: builder.query<LedgerAccount[], void>({
      query: () => ({
        url: '/ledger/my-accounts',
        method: 'GET',
      }),
      transformResponse: (res: LedgerAccountsResponse) => res.accounts || [],
      providesTags: ['Me', 'Ledger'],
    }),

    /**
     * GET /api/ledger/my-accounts/:type/balance
     * Получить баланс конкретного счёта
     *
     * @param type - тип счёта (cash_rub, pv, vwc)
     * @param currency - валюта (RUB, VWC, PV)
     */
    getMyAccountBalance: builder.query<LedgerAccount, { type: string; query: LedgerBalanceQuery }>({
      query: ({ type, query }) => ({
        url: `/ledger/my-accounts/${type}/balance`,
        method: 'GET',
        params: query,
      }),
      transformResponse: (res: LedgerAccountResponse) => res.account,
      providesTags: ['Me', 'Ledger'],
    }),

    /**
     * GET /api/ledger/my-transactions
     * Получить мою историю транзакций (проводок)
     *
     * Возвращает LedgerPostingView - объединённые данные posting + txn:
     * - id, opType, currency, amount, createdAt, memo, operationId
     *
     * Типы операций:
     * - order_accrual - начисление за заказ (PV, кэшбек)
     * - order_payment - оплата заказа (RUB)
     * - refund - возврат
     * - fast_start - Fast Start бонус
     * - infinity - Infinity бонус (сетевой)
     * - withdrawal_request - заявка на вывод (резерв RUB)
     * - withdrawal_payout - выплата (списание RUB)
     * - и т.д.
     */
    getMyTransactions: builder.query<
      { transactions: LedgerPostingView[]; pagination: { limit: number; offset: number } },
      LedgerTransactionsQuery | void
    >({
      query: (params = {}) => ({
        url: '/ledger/my-transactions',
        method: 'GET',
        params: {
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      }),
      transformResponse: (res: LedgerTransactionsResponse) => ({
        transactions: res.transactions || [],
        pagination: res.pagination || { limit: 20, offset: 0 },
      }),
      providesTags: ['Me', 'Ledger'],
    }),

    /* ─────────── Admin Ledger Queries ─────────── */

    /**
     * GET /api/admin/ledger/accounts
     * Получить все счета в системе (ADMIN)
     *
     * Включает:
     * - Пользовательские счета (ownerType='user', ownerId=userId)
     * - Системные счета (ownerType='system', ownerId=null)
     *
     * Системные счета:
     * - reserve_special - резервный фонд
     * - network_fund - фонд сети
     */
    getAdminAllAccounts: builder.query<
      { accounts: LedgerAccount[]; pagination: { limit: number; offset: number } },
      LedgerTransactionsQuery | void
    >({
      query: (params = {}) => ({
        url: '/admin/ledger/accounts',
        method: 'GET',
        params: {
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      }),
      transformResponse: (res: AdminLedgerAccountsResponse) => ({
        accounts: res.accounts || [],
        pagination: res.pagination || { limit: 20, offset: 0 },
      }),
      providesTags: ['Ledger'],
    }),

    /**
     * GET /api/admin/ledger/accounts/:userId
     * Получить все счета пользователя (ADMIN)
     *
     * Возвращает 3 счета: cash_rub, vwc, pv
     */
    getAdminUserAccounts: builder.query<LedgerAccount[], string>({
      query: (userId) => ({
        url: `/admin/ledger/accounts/${userId}`,
        method: 'GET',
      }),
      transformResponse: (res: LedgerAccountsResponse) => res.accounts || [],
      providesTags: (result, error, userId) => [{ type: 'Ledger', id: userId }],
    }),

    /**
     * GET /api/admin/ledger/transactions/:userId
     * Получить историю транзакций пользователя (ADMIN)
     */
    getAdminUserTransactions: builder.query<
      { transactions: LedgerPostingView[]; pagination: { limit: number; offset: number } },
      { userId: string; params?: LedgerTransactionsQuery }
    >({
      query: ({ userId, params = {} }) => ({
        url: `/admin/ledger/transactions/${userId}`,
        method: 'GET',
        params: {
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      }),
      transformResponse: (res: AdminLedgerTransactionsResponse) => ({
        transactions: res.items || [],
        pagination: res.pagination || { limit: 20, offset: 0 },
      }),
      providesTags: (result, error, { userId }) => [{ type: 'Ledger', id: userId }],
    }),

    /**
     * GET /api/admin/ledger/transactions
     * Получить все транзакции в системе (ADMIN)
     *
     * Для мониторинга и аудита.
     */
    getAdminAllTransactions: builder.query<
      { transactions: LedgerPostingView[]; pagination: { limit: number; offset: number } },
      LedgerTransactionsQuery | void
    >({
      query: (params = {}) => ({
        url: '/admin/ledger/transactions',
        method: 'GET',
        params: {
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      }),
      transformResponse: (res: LedgerTransactionsResponse) => ({
        transactions: res.transactions || [],
        pagination: res.pagination || { limit: 20, offset: 0 },
      }),
      providesTags: ['Ledger'],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // User queries
  useGetMyAccountsQuery,
  useLazyGetMyAccountsQuery,
  useGetMyAccountBalanceQuery,
  useLazyGetMyAccountBalanceQuery,
  useGetMyTransactionsQuery,
  useLazyGetMyTransactionsQuery,

  // Admin queries
  useGetAdminAllAccountsQuery,
  useLazyGetAdminAllAccountsQuery,
  useGetAdminUserAccountsQuery,
  useLazyGetAdminUserAccountsQuery,
  useGetAdminUserTransactionsQuery,
  useLazyGetAdminUserTransactionsQuery,
  useGetAdminAllTransactionsQuery,
  useLazyGetAdminAllTransactionsQuery,
} = ledgerApi;
