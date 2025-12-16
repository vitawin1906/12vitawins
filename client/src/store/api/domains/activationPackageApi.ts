/**
 * Activation Package API
 * Управление пакетами Partner и Partner Pro
 */

import { baseApi } from '../baseApi';

export interface ActivationPackage {
  id: number;
  userId: string;
  packageType: 'partner' | 'partner_pro';
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  orderId?: string;
  purchaseDate: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseResponse {
  success: boolean;
  package?: ActivationPackage;
  order?: any;
  paymentUrl?: string;
  error?: string;
}

export interface UpgradeEligibility {
  canUpgrade: boolean;
  reason?: string;
  partnerPackageDate?: string;
  daysRemaining?: number;
}

/* ==================== API ==================== */

export const activationPackageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ==================== User Endpoints ==================== */

    /**
     * Купить пакет Partner (7500 RUB)
     * POST /api/activation-packages/partner
     */
    purchasePartner: builder.mutation<PurchaseResponse, void>({
      query: () => ({
        url: '/activation-packages/partner',
        method: 'POST',
      }),
      invalidatesTags: ['ActivationPackage', 'User'],
    }),

    /**
     * Купить пакет Partner Pro (30000 RUB)
     * POST /api/activation-packages/partner-pro
     */
    purchasePartnerPro: builder.mutation<PurchaseResponse, void>({
      query: () => ({
        url: '/activation-packages/partner-pro',
        method: 'POST',
      }),
      invalidatesTags: ['ActivationPackage', 'User'],
    }),

    /**
     * Upgrade Partner → Partner Pro (в течение 5 недель)
     * POST /api/activation-packages/upgrade
     */
    upgradeToPartnerPro: builder.mutation<PurchaseResponse, void>({
      query: () => ({
        url: '/activation-packages/upgrade',
        method: 'POST',
      }),
      invalidatesTags: ['ActivationPackage', 'User'],
    }),

    /**
     * Получить мои пакеты активации
     * GET /api/activation-packages/my
     */
    getMyActivationPackages: builder.query<ActivationPackage[], void>({
      query: () => '/activation-packages/my',
      providesTags: ['ActivationPackage'],
    }),

    /**
     * Проверить возможность апгрейда до Partner Pro
     * GET /api/activation-packages/can-upgrade
     */
    checkUpgradeEligibility: builder.query<UpgradeEligibility, void>({
      query: () => '/activation-packages/can-upgrade',
    }),

    /* ==================== Admin Endpoints ==================== */

    /**
     * Получить все пакеты активации (админ)
     * GET /api/admin/activation-packages
     */
    getAllActivationPackages: builder.query<ActivationPackage[], void>({
      query: () => '/admin/activation-packages',
      providesTags: ['ActivationPackage'],
    }),

    /**
     * Получить пакеты пользователя (админ)
     * GET /api/admin/activation-packages/user/:userId
     */
    getUserActivationPackages: builder.query<ActivationPackage[], string>({
      query: (userId) => `/admin/activation-packages/user/${userId}`,
      providesTags: ['ActivationPackage'],
    }),

    /**
     * Проверить возможность апгрейда пользователя (админ)
     * GET /api/admin/activation-packages/:userId/can-upgrade
     */
    checkUserUpgradeEligibility: builder.query<UpgradeEligibility, string>({
      query: (userId) => `/admin/activation-packages/${userId}/can-upgrade`,
    }),

    /**
     * Получить статистику пакетов (админ)
     * GET /api/admin/activation-packages/stats
     */
    getActivationPackageStats: builder.query<{
      totalPartner: number;
      totalPartnerPro: number;
      totalRevenue: number;
      pendingPackages: number;
    }, void>({
      query: () => '/admin/activation-packages/stats',
    }),
  }),
});

export const {
  // User
  usePurchasePartnerMutation,
  usePurchasePartnerProMutation,
  useUpgradeToPartnerProMutation,
  useGetMyActivationPackagesQuery,
  useCheckUpgradeEligibilityQuery,
  useLazyCheckUpgradeEligibilityQuery,

  // Admin
  useGetAllActivationPackagesQuery,
  useGetUserActivationPackagesQuery,
  useCheckUserUpgradeEligibilityQuery,
  useGetActivationPackageStatsQuery,
} = activationPackageApi;
