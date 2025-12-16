import { baseApi } from '../baseApi';
import { normalizeOrderFromApi, normalizeOrdersList, UiOrder } from '@/utils/orders/normalize';
import type { CreateOrderInput } from '@/types/cart';

/* ======================== Types ======================== */

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order extends UiOrder {}

export interface OrdersListQueryParams {
  status?: string;
  deliveryStatus?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

/* ======================== API ======================== */

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── User Queries ─────────── */

    /**
     * GET /api/orders/my
     * Получить мои заказы (user)
     */
    getMyOrders: builder.query<Order[], void>({
      query: () => ({
        url: '/orders/my',
        method: 'GET',
      }),
      transformResponse: (res: any) => normalizeOrdersList(res),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Orders' as const, id })),
              { type: 'Orders', id: 'MY_LIST' },
            ]
          : [{ type: 'Orders', id: 'MY_LIST' }],
    }),

    /**
     * GET /api/orders/:id
     * Получить заказ по ID (user)
     */
    getOrderById: builder.query<Order, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'GET',
      }),
      transformResponse: (res: any) => {
        const payload = res?.order ?? res?.data ?? res?.item ?? res;
        return normalizeOrderFromApi(payload);
      },
      providesTags: (result, error, id) => [{ type: 'Orders', id }],
    }),

    /* ─────────── User Mutations ─────────── */

    /**
     * POST /api/orders
     * Создать заказ из корзины (user)
     */
    createOrder: builder.mutation<Order, CreateOrderInput>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        data: body,
      }),
      transformResponse: (res: any) =>
        normalizeOrderFromApi(res?.order ?? res?.data ?? res),
      invalidatesTags: [
        { type: 'Orders', id: 'MY_LIST' },
        { type: 'Orders', id: 'ADMIN_LIST' },
        'Cart',
      ],
    }),

    /**
     * POST /api/orders/:id/cancel
     * Отменить заказ (user)
     */
    cancelOrder: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/orders/${id}/cancel`,
        method: 'POST',
      }),
      transformResponse: (res: any) =>
        normalizeOrderFromApi(res?.order ?? res?.data ?? res),
      invalidatesTags: (result, error, id) => [
        { type: 'Orders', id },
        { type: 'Orders', id: 'MY_LIST' },
        { type: 'Orders', id: 'ADMIN_LIST' },
      ],
    }),

    /* ─────────── Admin Queries ─────────── */

    /**
     * GET /api/admin/orders
     * Получить все заказы (admin)
     */
    getAllOrders: builder.query<Order[], OrdersListQueryParams | void>({
      query: (params) => ({
        url: '/admin/orders',
        method: 'GET',
        params: params && {
          status: params.status,
          deliveryStatus: params.deliveryStatus,
          limit: params.limit,
          offset: params.offset,
          search: params.search,
        },
      }),
      transformResponse: (res: any) => normalizeOrdersList(res),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Orders' as const, id })),
              { type: 'Orders', id: 'ADMIN_LIST' },
            ]
          : [{ type: 'Orders', id: 'ADMIN_LIST' }],
    }),

    /**
     * GET /api/admin/orders/:id
     * Получить заказ по ID (admin)
     */
    getOrderByIdAdmin: builder.query<Order, string>({
      query: (id) => ({
        url: `/admin/orders/${id}`,
        method: 'GET',
      }),
      transformResponse: (res: any) => {
        const payload = res?.order ?? res?.data ?? res?.item ?? res;
        return normalizeOrderFromApi(payload);
      },
      providesTags: (result, error, id) => [{ type: 'Orders', id }],
    }),

    /* ─────────── Admin Mutations ─────────── */

    /**
     * PUT /api/admin/orders/:id/status
     * Обновить статус заказа (admin)
     */
    updateOrderStatus: builder.mutation<Order, { orderId: string; status: string }>({
      query: ({ orderId, status }) => ({
        url: `/admin/orders/${orderId}/status`,
        method: 'PUT',
        data: { status },
      }),
      transformResponse: (res: any) =>
        normalizeOrderFromApi(res?.order ?? res?.data ?? res),
      invalidatesTags: (result, error, args) => [
        { type: 'Orders', id: args.orderId },
        { type: 'Orders', id: 'ADMIN_LIST' },
      ],
    }),

    /**
     * PUT /api/admin/orders/:id/delivery-status
     * Обновить статус доставки (admin)
     */
    updateDeliveryStatus: builder.mutation<
      Order,
      { orderId: string; deliveryStatus: string; trackingCode?: string }
    >({
      query: ({ orderId, deliveryStatus, trackingCode }) => ({
        url: `/admin/orders/${orderId}/delivery-status`,
        method: 'PUT',
        data: { deliveryStatus, ...(trackingCode ? { trackingCode } : {}) },
      }),
      transformResponse: (res: any) =>
        normalizeOrderFromApi(res?.order ?? res?.data ?? res),
      invalidatesTags: (result, error, args) => [
        { type: 'Orders', id: args.orderId },
        { type: 'Orders', id: 'ADMIN_LIST' },
      ],
    }),

    /**
     * POST /api/admin/orders/:id/mark-delivered
     * Пометить заказ доставленным (admin)
     */
    markAsDelivered: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/admin/orders/${id}/mark-delivered`,
        method: 'POST',
      }),
      transformResponse: (res: any) =>
        normalizeOrderFromApi(res?.order ?? res?.data ?? res),
      invalidatesTags: (result, error, id) => [
        { type: 'Orders', id },
        { type: 'Orders', id: 'ADMIN_LIST' },
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // User queries
  useGetMyOrdersQuery,
  useLazyGetMyOrdersQuery,
  useGetOrderByIdQuery,
  useLazyGetOrderByIdQuery,

  // User mutations
  useCreateOrderMutation,
  useCancelOrderMutation,

  // Admin queries
  useGetAllOrdersQuery,
  useLazyGetAllOrdersQuery,
  useGetOrderByIdAdminQuery,
  useLazyGetOrderByIdAdminQuery,

  // Admin mutations
  useUpdateOrderStatusMutation,
  useUpdateDeliveryStatusMutation,
  useMarkAsDeliveredMutation,
} = ordersApi;
