import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export type WithdrawalStatus =
    | 'requested'
    | 'in_review'
    | 'approved'
    | 'rejected'
    | 'paid'
    | 'canceled';

export interface Withdrawal {
    id: string;
    userId: string;
    amountRub: string; // NUMERIC → string
    method: string;
    status: WithdrawalStatus;
    payload?: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
    // на будущее можно добавить requestedAt/processedAt, если появятся в схеме
}

export interface WithdrawalCreateDto {
    amountRub: number;
    method: string;
    destination: {
        fullName: string;
        inn: string;
        bik: string;
        accountNumber: string;
    };
    idempotencyKey: string;
    metadata?: Record<string, any>;
}

export interface WithdrawalsListResponse {
    success: boolean;
    data: Withdrawal[];
    total?: number;
}

export interface WithdrawalResponse {
    success: boolean;
    data: Withdrawal;
}

/* ======================== API ======================== */

export const withdrawalApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /* ─────────── User Withdrawal Queries ─────────── */

        /**
         * GET /api/withdrawals/me
         * Получить мои заявки на вывод
         */
        getMyWithdrawals: builder.query<Withdrawal[], { limit?: number; offset?: number } | void>({
            query: (args) => {
                const { limit = 50, offset = 0 } = args || {};
                return {
                    url: '/withdrawals/me',
                    method: 'GET',
                    params: { limit, offset },
                };
            },
            transformResponse: (res: WithdrawalsListResponse) => res.data || [],
            providesTags: ['Me'],
        }),

        /* ─────────── User Withdrawal Mutations ─────────── */

        /**
         * POST /api/withdrawals
         * Создать заявку на вывод
         */
        createWithdrawal: builder.mutation<Withdrawal, WithdrawalCreateDto>({
            query: (data) => ({
                url: '/withdrawals',
                method: 'POST',
                data: {
                    amountRub: data.amountRub,
                    method: data.method,
                    destination: {
                        fullName: data.destination.fullName,
                        inn: data.destination.inn,
                        bik: data.destination.bik,
                        accountNumber: data.destination.accountNumber,
                    },
                    idempotencyKey: data.idempotencyKey,
                    metadata: data.metadata,
                },
            }),
            transformResponse: (res: WithdrawalResponse) => res.data,
            invalidatesTags: ['Me'],
        }),

        /**
         * DELETE /api/withdrawals/:id
         * Отменить свою заявку
         */
        cancelWithdrawal: builder.mutation<void, string>({
            query: (id) => ({
                url: `/withdrawals/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Me'],
        }),

        /* ─────────── Admin Withdrawal Queries ─────────── */

        /**
         * GET /api/admin/withdrawals
         * Получить все заявки на вывод (ADMIN)
         */
        getAdminWithdrawals: builder.query<Withdrawal[], { userId?: string; status?: WithdrawalStatus } | void>({
            query: (args) => {
                const params: Record<string, any> = {};
                if (args?.userId) params.userId = args.userId;
                if (args?.status) params.status = args.status;
                return {
                    url: '/admin/withdrawals',
                    method: 'GET',
                    params,
                };
            },
            transformResponse: (res: WithdrawalsListResponse) => res.data || [],
            providesTags: ['Me'],
        }),

        /* ─────────── Admin Withdrawal Mutations ─────────── */

        /**
         * POST /api/admin/withdrawals/:id/approve
         * Подтвердить заявку (ADMIN)
         */
        adminApproveWithdrawal: builder.mutation<void, { id: string; note?: string }>({
            query: ({ id, note }) => ({
                url: `/admin/withdrawals/${id}/approve`,
                method: 'POST',
                data: note ? { note } : {},
            }),
            invalidatesTags: ['Me'],
        }),

        /**
         * POST /api/admin/withdrawals/:id/reject
         * Отклонить заявку (ADMIN)
         */
        adminRejectWithdrawal: builder.mutation<void, { id: string; reason: string }>({
            query: ({ id, reason }) => ({
                url: `/admin/withdrawals/${id}/reject`,
                method: 'POST',
                data: { reason },
            }),
            invalidatesTags: ['Me'],
        }),

        /**
         * POST /api/admin/withdrawals/:id/mark-paid
         * Отметить как оплаченное (ADMIN)
         */
        adminMarkWithdrawalPaid: builder.mutation<void, { id: string; providerInfo?: Record<string, any> }>({
            query: ({ id, providerInfo = {} }) => ({
                url: `/admin/withdrawals/${id}/mark-paid`,
                method: 'POST',
                data: { providerInfo },
            }),
            invalidatesTags: ['Me'],
        }),
    }),
});

export const {
    useGetMyWithdrawalsQuery,
    useLazyGetMyWithdrawalsQuery,
    useCreateWithdrawalMutation,
    useCancelWithdrawalMutation,
    useGetAdminWithdrawalsQuery,
    useLazyGetAdminWithdrawalsQuery,
    useAdminApproveWithdrawalMutation,
    useAdminRejectWithdrawalMutation,
    useAdminMarkWithdrawalPaidMutation,
} = withdrawalApi;
