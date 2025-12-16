import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface BatchUpgradeRequest {
  limit?: number;
}

export interface BatchUpgradeResponse {
  success: boolean;
  message: string;
  result: {
    processed: number;
    upgraded: number;
    skipped: number;
    upgradeDetails?: Array<{
      userId: string;
      upgraded: boolean;
      reason?: string;
    }>;
  };
}

export interface UpgradeUserResponse {
  success: boolean;
  upgraded: boolean;
  message: string;
}

/* ======================== API ======================== */

export const partnerUpgradeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── Admin Mutations ─────────── */

    /**
     * POST /api/admin/partner-upgrade/batch
     * Batch обработка: проверить всех customers на возможность upgrade (admin)
     */
    batchUpgradePartners: builder.mutation<BatchUpgradeResponse, BatchUpgradeRequest>({
      query: (body) => ({
        url: '/admin/partner-upgrade/batch',
        method: 'POST',
        data: {
          limit: body?.limit ?? 100,
        },
      }),
      invalidatesTags: ['Users', 'Stats'],
    }),

    /**
     * POST /api/admin/partner-upgrade/user/:userId
     * Проверить и upgrade конкретного пользователя (admin)
     */
    upgradeUserToPartner: builder.mutation<UpgradeUserResponse, string>({
      query: (userId) => ({
        url: `/admin/partner-upgrade/user/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, userId) => [
        { type: 'Users', id: userId },
        'Users',
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  useBatchUpgradePartnersMutation,
  useUpgradeUserToPartnerMutation,
} = partnerUpgradeApi;
