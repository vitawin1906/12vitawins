/**
 * Payments API
 * Управление платежами через Tinkoff
 */

import { baseApi } from '../baseApi';

export interface Payment {
  id: string;
  orderId: string;
  userId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  paymentUrl?: string;
  tinkoffPaymentId?: string;
  tinkoffOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreatePaymentResponse {
  success: boolean;
  payment?: Payment;
  paymentUrl?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  payment?: Payment;
  error?: string;
}

export interface PaymentStatsResponse {
  totalPayments: number;
  totalAmount: number;
  pendingCount: number;
  confirmedCount: number;
  rejectedCount: number;
  cancelledCount: number;
}

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ==================== User Endpoints ==================== */

    /**
     * Создать новый платеж
     * POST /api/payments
     */
    createPayment: builder.mutation<CreatePaymentResponse, CreatePaymentRequest>({
      query: (data) => ({
        url: '/payments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payment'],
    }),

    /**
     * Получить мои платежи
     * GET /api/payments/my
     */
    getMyPayments: builder.query<Payment[], void>({
      query: () => '/payments/my',
      providesTags: ['Payment'],
    }),

    /**
     * Получить статус платежа
     * GET /api/payments/:id
     */
    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (id) => `/payments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),

    /* ==================== Admin Endpoints ==================== */

    /**
     * Получить все платежи (админ)
     * GET /api/admin/payments
     */
    getAllPayments: builder.query<Payment[], void>({
      query: () => '/admin/payments',
      providesTags: ['Payment'],
    }),

    /**
     * Получить статистику платежей (админ)
     * GET /api/admin/payments/stats
     */
    getPaymentStats: builder.query<PaymentStatsResponse, void>({
      query: () => '/admin/payments/stats',
    }),

    /**
     * Повторить платеж (админ)
     * POST /api/admin/payments/:id/retry
     */
    retryPayment: builder.mutation<PaymentStatusResponse, string>({
      query: (id) => ({
        url: `/admin/payments/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: ['Payment'],
    }),
  }),
});

export const {
  // User
  useCreatePaymentMutation,
  useGetMyPaymentsQuery,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,

  // Admin
  useGetAllPaymentsQuery,
  useGetPaymentStatsQuery,
  useRetryPaymentMutation,
} = paymentsApi;
