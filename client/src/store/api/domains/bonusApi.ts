import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface BonusPreferences {
  healthPercent: number;
  travelPercent: number;
  homePercent: number;
  autoPercent: number;
  locked: boolean;
  referrerLocked: boolean;
}

export interface BonusPreferencesResponse {
  success: boolean;
  data: BonusPreferences;
}

export interface UpdateBonusPreferencesDto {
  health_percent: number;
  travel_percent: number;
  home_percent: number;
  auto_percent: number;
}

export interface LockBonusPreferencesDto {
  isLocked: boolean;
}

/* ======================== API ======================== */

export const bonusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── User Bonus Queries ─────────── */

    /**
     * GET /api/bonus-preferences
     * Получить текущие бонусные предпочтения пользователя
     */
    getBonusPreferences: builder.query<BonusPreferences, void>({
      query: () => ({
        url: '/bonus-preferences',
        method: 'GET',
      }),
      transformResponse: (res: BonusPreferencesResponse) => res.data,
      providesTags: ['Me'],
    }),

    /* ─────────── User Bonus Mutations ─────────── */

    /**
     * PUT /api/bonus-preferences
     * Обновить бонусные предпочтения пользователя
     * Сумма всех процентов должна быть равна 100
     */
    updateBonusPreferences: builder.mutation<BonusPreferences, UpdateBonusPreferencesDto>({
      query: (data) => ({
        url: '/bonus-preferences',
        method: 'PUT',
        data,
      }),
      transformResponse: (res: BonusPreferencesResponse) => res.data,
      invalidatesTags: ['Me'],
    }),

    /* ─────────── Admin Bonus Mutations ─────────── */

    /**
     * POST /api/admin/bonus-preferences/:userId/lock
     * Заблокировать/разблокировать бонусные предпочтения пользователя (ADMIN)
     */
    adminLockBonusPreferences: builder.mutation<void, { userId: string; isLocked: boolean }>({
      query: ({ userId, isLocked }) => ({
        url: `/admin/bonus-preferences/${userId}/lock`,
        method: 'POST',
        data: { isLocked },
      }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useGetBonusPreferencesQuery,
  useLazyGetBonusPreferencesQuery,
  useUpdateBonusPreferencesMutation,
  useAdminLockBonusPreferencesMutation,
} = bonusApi;
