import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface NetworkFundBalance {
  success: boolean;
  balance: string;
  currency: string;
}

export interface NetworkFundStats {
  success: boolean;
  stats: {
    totalBalance: string;
    totalAllocated: string;
    totalDistributed: string;
    pendingDistribution: string;
  };
}

export interface AllocateRequest {
  orderId: string;
}

export interface DistributeRequest {
  orderId: string;
}

export interface DistributeResponse {
  success: boolean;
  message: string;
  allocation: {
    totalFundRub: string;
    referralBonusesRub: string;
    binaryBonusesRub: string;
    rankBonusesRub: string;
    unallocatedRub: string;
  };
}

export interface WithdrawRequest {
  userId: string;
  amountRub: number;
  reason: string;
  orderId?: string;
}

export interface WithdrawResponse {
  success: boolean;
  message: string;
  withdrawal: {
    userId: string;
    amountRub: string;
    reason: string;
  };
}

/* ======================== API ======================== */

export const networkFundApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── Admin Queries ─────────── */

    /**
     * GET /api/admin/network-fund/balance
     * Получить баланс сетевого фонда (admin)
     */
    getNetworkFundBalance: builder.query<NetworkFundBalance, void>({
      query: () => ({
        url: '/admin/network-fund/balance',
        method: 'GET',
      }),
      providesTags: ['NetworkFund'],
    }),

    /**
     * GET /api/admin/network-fund/stats
     * Получить статистику сетевого фонда (admin)
     */
    getNetworkFundStats: builder.query<NetworkFundStats, void>({
      query: () => ({
        url: '/admin/network-fund/stats',
        method: 'GET',
      }),
      providesTags: ['NetworkFund'],
    }),

    /* ─────────── Admin Mutations ─────────── */

    /**
     * POST /api/admin/network-fund/allocate
     * Начислить средства в фонд из заказа (admin)
     */
    allocateFromOrder: builder.mutation<{ success: boolean; message: string }, AllocateRequest>({
      query: (body) => ({
        url: '/admin/network-fund/allocate',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['NetworkFund'],
    }),

    /**
     * POST /api/admin/network-fund/distribute
     * Распределить бонусы из фонда (admin)
     */
    distributeBonuses: builder.mutation<DistributeResponse, DistributeRequest>({
      query: (body) => ({
        url: '/admin/network-fund/distribute',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['NetworkFund', 'Ledger'],
    }),

    /**
     * POST /api/admin/network-fund/withdraw
     * Вывести средства из фонда (admin)
     */
    withdrawFromFund: builder.mutation<WithdrawResponse, WithdrawRequest>({
      query: (body) => ({
        url: '/admin/network-fund/withdraw',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['NetworkFund', 'Ledger'],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // Queries
  useGetNetworkFundBalanceQuery,
  useLazyGetNetworkFundBalanceQuery,
  useGetNetworkFundStatsQuery,
  useLazyGetNetworkFundStatsQuery,

  // Mutations
  useAllocateFromOrderMutation,
  useDistributeBonusesMutation,
  useWithdrawFromFundMutation,
} = networkFundApi;
