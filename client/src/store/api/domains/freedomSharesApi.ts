// client/src/store/api/domains/freedomSharesApi.ts
import { baseApi } from '../baseApi';
import { camelizeKeys } from 'humps';

// ---------- Типы ----------

export interface FreedomShares {
  personalFreedom: number;
  financialFreedom: number;
  timeFreedom: number;
  socialFreedom: number;
}

export interface FreedomSharesBalances {
  personalFreedom: string;
  financialFreedom: string;
  timeFreedom: string;
  socialFreedom: string;
}

export interface FreedomSharesResponse {
  success: boolean;
  freedomShares: {
    shares: FreedomShares;
    balances: FreedomSharesBalances;
  };
}

export interface FreedomSharesPreset {
  id: string;
  name: string;
  description: string;
  shares: FreedomShares;
}

export interface UpdateFreedomSharesInput {
  personalFreedom: number;
  financialFreedom: number;
  timeFreedom: number;
  socialFreedom: number;
}

export interface SimulateFreedomSharesInput {
  amount: number;
}

export interface SimulateFreedomSharesResponse {
  success: boolean;
  simulation: {
    totalAmount: number;
    allocation: FreedomShares;
  };
}

// ---------- API Slice ----------

export const freedomSharesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Получить текущие Freedom Shares пользователя
    getFreedomShares: builder.query<FreedomSharesResponse, void>({
      query: () => ({
        url: '/freedom-shares',
        method: 'GET',
      }),
      transformResponse: (response: any) => camelizeKeys(response),
      providesTags: ['FreedomShares'],
    }),

    // Обновить Freedom Shares
    updateFreedomShares: builder.mutation<{ success: boolean; message: string; shares: FreedomShares }, UpdateFreedomSharesInput>({
      query: (body) => ({
        url: '/freedom-shares',
        method: 'PUT',
        body,
      }),
      transformResponse: (response: any) => camelizeKeys(response),
      invalidatesTags: ['FreedomShares'],
    }),

    // Получить пресеты
    getFreedomSharesPresets: builder.query<{ success: boolean; presets: FreedomSharesPreset[] }, void>({
      query: () => ({
        url: '/freedom-shares/presets',
        method: 'GET',
      }),
      transformResponse: (response: any) => camelizeKeys(response),
    }),

    // Применить пресет
    applyFreedomSharesPreset: builder.mutation<{ success: boolean; message: string; shares: FreedomShares }, string>({
      query: (presetId) => ({
        url: '/freedom-shares/apply-preset',
        method: 'POST',
        body: { presetId },
      }),
      transformResponse: (response: any) => camelizeKeys(response),
      invalidatesTags: ['FreedomShares'],
    }),

    // Симулировать распределение
    simulateFreedomShares: builder.mutation<SimulateFreedomSharesResponse, SimulateFreedomSharesInput>({
      query: (body) => ({
        url: '/freedom-shares/simulate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => camelizeKeys(response),
    }),
  }),
});

// ---------- Hooks ----------
export const {
  useGetFreedomSharesQuery,
  useUpdateFreedomSharesMutation,
  useGetFreedomSharesPresetsQuery,
  useApplyFreedomSharesPresetMutation,
  useSimulateFreedomSharesMutation,
} = freedomSharesApi;
