import { baseApi } from '../baseApi';
import type {
  Review,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewsResponse,
  ReviewResponse,
  ReviewsQuery,
} from '@/types/review';
import { normalizeReviewFromApi, normalizeReviewsFromApi } from '@/utils/review/normalize';

/* ======================== API ======================== */

/**
 * Reviews API
 *
 * Управление отзывами на товары.
 *
 * Особенности:
 * - Один пользователь может оставить только один отзыв на товар
 * - Все отзывы проходят модерацию (status: pending → published/rejected)
 * - verifiedPurchase автоматически ставится если пользователь купил товар
 */
export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── Public Review Queries ─────────── */

    /**
     * GET /api/reviews
     * Получить опубликованные отзывы
     *
     * Доступно всем (без авторизации)
     * Можно фильтровать по productId
     */
    getPublicReviews: builder.query<Review[], ReviewsQuery | void>({
      query: (params = {}) => ({
        url: '/reviews',
        method: 'GET',
        params,
      }),
      transformResponse: (res: ReviewsResponse) => {
        const rawReviews = res.reviews || [];
        return normalizeReviewsFromApi(rawReviews);
      },
      providesTags: (result, error, params) => {
        const productId = params?.productId;
        return result
          ? [
              ...result.map(({ id }) => ({ type: 'Review' as const, id })),
              { type: 'Review', id: productId ? `PRODUCT_${productId}` : 'PUBLIC_LIST' },
            ]
          : [{ type: 'Review', id: productId ? `PRODUCT_${productId}` : 'PUBLIC_LIST' }];
      },
    }),

    /**
     * GET /api/reviews/:id
     * Получить отзыв по ID
     */
    getReviewById: builder.query<Review, string>({
      query: (id) => ({
        url: `/reviews/${id}`,
        method: 'GET',
      }),
      transformResponse: (res: ReviewResponse) => {
        return normalizeReviewFromApi(res.review);
      },
      providesTags: (result, error, id) => [{ type: 'Review', id }],
    }),

    /* ─────────── User Review Mutations ─────────── */

    /**
     * POST /api/reviews
     * Создать отзыв на товар
     *
     * Требует авторизации
     * Автоматически проверяет:
     * - Не оставлял ли пользователь уже отзыв на этот товар
     * - Покупал ли пользователь этот товар (verifiedPurchase)
     */
    createReview: builder.mutation<Review, CreateReviewDto>({
      query: (data) => ({
        url: '/reviews',
        method: 'POST',
        data,
      }),
      transformResponse: (res: ReviewResponse) => {
        return normalizeReviewFromApi(res.review);
      },
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Review', id: 'PUBLIC_LIST' },
        { type: 'Review', id: `PRODUCT_${productId}` },
        { type: 'Review', id: 'MY_LIST' },
      ],
    }),

    /**
     * PUT /api/reviews/:id
     * Обновить свой отзыв
     *
     * Можно обновлять только свои отзывы
     * После обновления статус сбрасывается на 'pending' для повторной модерации
     */
    updateReview: builder.mutation<Review, { id: string } & UpdateReviewDto>({
      query: ({ id, ...data }) => ({
        url: `/reviews/${id}`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: ReviewResponse) => {
        return normalizeReviewFromApi(res.review);
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Review', id },
        { type: 'Review', id: 'PUBLIC_LIST' },
        { type: 'Review', id: 'MY_LIST' },
      ],
    }),

    /**
     * DELETE /api/reviews/:id
     * Удалить свой отзыв
     */
    deleteReview: builder.mutation<void, string>({
      query: (id) => ({
        url: `/reviews/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Review', id },
        { type: 'Review', id: 'PUBLIC_LIST' },
        { type: 'Review', id: 'MY_LIST' },
      ],
    }),

    /* ─────────── Admin Review Queries ─────────── */

    /**
     * GET /api/admin/reviews
     * Получить все отзывы (включая на модерации)
     *
     * ADMIN only
     */
    getAdminReviews: builder.query<Review[], ReviewsQuery | void>({
      query: (params = {}) => ({
        url: '/admin/reviews',
        method: 'GET',
        params,
      }),
      transformResponse: (res: ReviewsResponse) => {
        const rawReviews = res.reviews || [];
        return normalizeReviewsFromApi(rawReviews);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Review' as const, id })),
              { type: 'Review', id: 'ADMIN_LIST' },
            ]
          : [{ type: 'Review', id: 'ADMIN_LIST' }],
    }),

    /* ─────────── Admin Review Mutations ─────────── */

    /**
     * POST /api/admin/reviews/:id/approve
     * Одобрить отзыв (status: pending → published)
     *
     * ADMIN only
     */
    adminApproveReview: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/reviews/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Review', id },
        { type: 'Review', id: 'ADMIN_LIST' },
        { type: 'Review', id: 'PUBLIC_LIST' },
      ],
    }),

    /**
     * POST /api/admin/reviews/:id/reject
     * Отклонить отзыв (status: pending → rejected)
     *
     * ADMIN only
     */
    adminRejectReview: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/reviews/${id}/reject`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Review', id },
        { type: 'Review', id: 'ADMIN_LIST' },
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // Public queries
  useGetPublicReviewsQuery,
  useLazyGetPublicReviewsQuery,
  useGetReviewByIdQuery,
  useLazyGetReviewByIdQuery,

  // User mutations
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,

  // Admin queries
  useGetAdminReviewsQuery,
  useLazyGetAdminReviewsQuery,

  // Admin mutations
  useAdminApproveReviewMutation,
  useAdminRejectReviewMutation,
} = reviewsApi;
