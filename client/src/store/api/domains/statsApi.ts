import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface StatsData {
  range: 'today' | 'week' | 'month' | 'year' | 'all';
  period: {
    start: string;
    end: string;
  };
  order: {
    total: number;
    paid: string;
    pending: number;
    canceled: number;
    conversionRate: number;
  };
  revenue: {
    totalRub: number;
    averageRub: number;
  };
  users: {
    total: number;
    new: number;
    active: number;
    partners: number;
    partnersPro: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenueRub: number;
  }>;
  salesByDay: Array<{
    date: string;
    orderCount: number;
    revenueRub: number;
  }>;
  orderByStatus: Array<{
    status: string;
    count: number;
    revenueRub: number;
  }>;
  avgOrderByPeriod: Array<{
    period: string;
    avgOrderRub: number;
    orderCount: number;
  }>;
}

export interface StatsResponse {
  success: boolean;
  stats: StatsData;
}

export interface StatsQuery {
  range?: 'today' | 'week' | 'month' | 'year' | 'all';
}

/* ======================== API ======================== */

export const statsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * GET /api/admin/stats
     * Получить статистику и аналитику продаж (admin)
     */
    getAdminStats: builder.query<StatsData, StatsQuery | void>({
      query: (params) => ({
        url: '/admin/stats',
        method: 'GET',
        params: { range: params?.range || 'month' },
      }),
      transformResponse: (res: StatsResponse) => res.stats,
      providesTags: (result, error, params) => [
        { type: 'Stats', id: params?.range || 'month' },
      ],
      // Статистика обновляется часто, поэтому короткий кэш
      keepUnusedDataFor: 60,
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  useGetAdminStatsQuery,
  useLazyGetAdminStatsQuery,
} = statsApi;
