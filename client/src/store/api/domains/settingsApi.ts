import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface ReferralSettings {
  level1Commission: number;
  level2Commission: number;
  level3Commission: number;
  bonusCoinsPercentage: number;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  ipWhitelist: string[];
}

/**
 * CompanyCommitments - обязательства компании по качеству
 * Используется в компоненте CompanyCommitments.tsx
 */
export interface CompanyCommitments {
  id?: string;
  title?: string;                     // Главный заголовок "Наши обязательства по качеству"
  subtitle?: string;                  // Подзаголовок "Высочайшие стандарты"
  description1?: string;              // Первый абзац описания
  description2?: string;              // Второй абзац описания
  promise_title?: string;             // Заголовок обещания "Наше обещание"
  promise_text?: string;              // Текст обещания/гарантии
  guarantee_button_text?: string;     // Текст кнопки "Получить гарантию качества"
  guarantee_button_url?: string;      // URL кнопки гарантии
}

export interface PaymentSettings {
  id: string;
  provider: string;
  terminalKey: string;
  secretKey: string;
  isTestMode: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface NewPaymentSettings {
  provider: string;
  terminalKey: string;
  secretKey: string;
  isTestMode: boolean;
  isActive: boolean;
}

/* ======================== API ======================== */

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── Referral Settings ─────────── */

    /**
     * GET /api/admin/referral-settings
     * Получить настройки реферальной программы (ADMIN)
     */
    getReferralSettings: builder.query<{ settings: ReferralSettings }, void>({
      query: () => ({
        url: '/admin/referral-settings',
        method: 'GET',
      }),
      providesTags: ['Settings'],
    }),

    /**
     * POST /api/admin/referral-settings
     * Обновить настройки реферальной программы (ADMIN)
     */
    updateReferralSettings: builder.mutation<{ message: string }, Partial<ReferralSettings>>({
      query: (body) => ({
        url: '/admin/referral-settings',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Settings'],
    }),

    /* ─────────── Security Settings ─────────── */

    /**
     * GET /api/admin/security-settings
     * Получить настройки безопасности (ADMIN)
     */
    getSecuritySettings: builder.query<{ settings: SecuritySettings }, void>({
      query: () => ({
        url: '/admin/security-settings',
        method: 'GET',
      }),
      providesTags: ['Settings'],
    }),

    /**
     * POST /api/admin/security-settings
     * Обновить настройки безопасности (ADMIN)
     */
    updateSecuritySettings: builder.mutation<{ message: string }, Partial<SecuritySettings>>({
      query: (body) => ({
        url: '/admin/security-settings',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Settings'],
    }),

    /* ─────────── Company Commitments ─────────── */

    /**
     * GET /api/company-commitments
     * Получить обязательства компании (PUBLIC)
     */
    getCompanyCommitments: builder.query<CompanyCommitments[], void>({
      query: () => ({
        url: '/company-commitments',
        method: 'GET',
      }),
      transformResponse: (res: any) => res?.commitments ?? res?.data ?? res ?? [],
      providesTags: ['Settings'],
    }),

    /**
     * POST /api/admin/company-commitments
     * Обновить обязательства компании (ADMIN)
     */
    updateCompanyCommitments: builder.mutation<{ message: string }, CompanyCommitments[]>({
      query: (body) => ({
        url: '/admin/company-commitments',
        method: 'POST',
        data: { commitments: body },
      }),
      invalidatesTags: ['Settings'],
    }),

    /* ─────────── Payment Settings ─────────── */

    /**
     * GET /api/admin/payment-settings
     * Получить настройки платежей (ADMIN)
     */
    getPaymentSettings: builder.query<PaymentSettings[], void>({
      query: () => ({
        url: '/admin/payment-settings',
        method: 'GET',
      }),
      transformResponse: (res: any) => res?.settings ?? res?.data ?? res ?? [],
      providesTags: ['Settings'],
    }),

    /**
     * POST /api/admin/payment-settings
     * Создать настройки платежа (ADMIN)
     */
    createPaymentSettings: builder.mutation<{ message: string }, NewPaymentSettings>({
      query: (body) => ({
        url: '/admin/payment-settings',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Settings'],
    }),

    /**
     * PUT /api/admin/payment-settings/:id
     * Обновить настройки платежа (ADMIN)
     */
    updatePaymentSettings: builder.mutation<{ message: string }, { id: string; data: Partial<NewPaymentSettings> }>({
      query: ({ id, data }) => ({
        url: `/admin/payment-settings/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['Settings'],
    }),

    /**
     * DELETE /api/admin/payment-settings/:id
     * Удалить настройки платежа (ADMIN)
     */
    deletePaymentSettings: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/payment-settings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),

    /**
     * POST /api/admin/payment-settings/test-tinkoff
     * Тестировать подключение к Тинькофф (ADMIN)
     */
    testTinkoffConnection: builder.mutation<{ message: string; testMode: boolean }, { terminalKey: string; secretKey: string; isTestMode: boolean }>({
      query: (body) => ({
        url: '/admin/payment-settings/test-tinkoff',
        method: 'POST',
        data: body,
      }),
    }),
  }),
});

export const {
  useGetReferralSettingsQuery,
  useLazyGetReferralSettingsQuery,
  useUpdateReferralSettingsMutation,
  useGetSecuritySettingsQuery,
  useLazyGetSecuritySettingsQuery,
  useUpdateSecuritySettingsMutation,
  useGetCompanyCommitmentsQuery,
  useLazyGetCompanyCommitmentsQuery,
  useUpdateCompanyCommitmentsMutation,
  useGetPaymentSettingsQuery,
  useLazyGetPaymentSettingsQuery,
  useCreatePaymentSettingsMutation,
  useUpdatePaymentSettingsMutation,
  useDeletePaymentSettingsMutation,
  useTestTinkoffConnectionMutation,
} = settingsApi;
