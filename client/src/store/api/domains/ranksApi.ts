/**
 * Ranks API
 * Управление MLM рангами
 */

import { baseApi } from '../baseApi';

export interface Rank {
  rank: string; // Код ранга: 'customer', 'partner', 'pro', 'director', etc.
  label: string; // Отображаемое название
  pvRequirement: number; // Требование PV
  volumeRequirement: number; // Требование объема
  bonusPercentage: number; // Процент бонуса
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRankRequest {
  rank: string;
  label: string;
  pvRequirement: number;
  volumeRequirement: number;
  bonusPercentage: number;
  isActive?: boolean;
}

export interface UpdateRankRequest extends Partial<CreateRankRequest> {}

/* ==================== API ==================== */

export const ranksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ==================== Public Endpoints ==================== */

    /**
     * Получить список всех рангов
     * GET /api/ranks
     */
    listRanks: builder.query<Rank[], void>({
      query: () => '/ranks',
      providesTags: ['Rank'],
    }),

    /**
     * Получить ранг по коду
     * GET /api/ranks/:rank
     */
    getRankByCode: builder.query<Rank, string>({
      query: (rank) => `/ranks/${rank}`,
      providesTags: (_result, _error, rank) => [{ type: 'Rank', id: rank }],
    }),

    /* ==================== Admin Endpoints ==================== */

    /**
     * Создать новый ранг (админ)
     * POST /api/admin/ranks
     */
    createRank: builder.mutation<Rank, CreateRankRequest>({
      query: (data) => ({
        url: '/admin/ranks',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Rank'],
    }),

    /**
     * Обновить ранг (админ)
     * PUT /api/admin/ranks/:rank
     */
    updateRank: builder.mutation<Rank, { rank: string; data: UpdateRankRequest }>({
      query: ({ rank, data }) => ({
        url: `/admin/ranks/${rank}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Rank'],
    }),

    /**
     * Удалить ранг (админ)
     * DELETE /api/admin/ranks/:rank
     */
    deleteRank: builder.mutation<{ success: boolean }, string>({
      query: (rank) => ({
        url: `/admin/ranks/${rank}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Rank'],
    }),

    /**
     * Обеспечить наличие ранга Creator (админ)
     * POST /api/admin/ranks/ensure-creator
     */
    ensureCreatorRank: builder.mutation<Rank, void>({
      query: () => ({
        url: '/admin/ranks/ensure-creator',
        method: 'POST',
      }),
      invalidatesTags: ['Rank'],
    }),
  }),
});

export const {
  // Public
  useListRanksQuery,
  useGetRankByCodeQuery,
  useLazyGetRankByCodeQuery,

  // Admin
  useCreateRankMutation,
  useUpdateRankMutation,
  useDeleteRankMutation,
  useEnsureCreatorRankMutation,
} = ranksApi;
