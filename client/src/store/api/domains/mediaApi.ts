import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface UploadedMedia {
  id: string;
  url: string;
  cloudinaryPublicId: string;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  altText?: string | null;
  createdAt?: string;
}

export interface ProductImage {
  mediaId: string;
  url: string;
  role: 'main' | 'gallery';
  alt: string | null;
  sortOrder: number;
}

export interface MediaListResponse {
  success: boolean;
  items?: UploadedMedia[];
  media?: UploadedMedia[];
  data?: UploadedMedia[];
}

export interface MediaStatsResponse {
  success: boolean;
  stats: {
    total: number;
    totalSize: number;
    orphaned: number;
  };
}

export interface AttachImageResponse {
  success: boolean;
  message?: string;
  image: ProductImage;
}

export interface AttachImageDto {
  url: string;
  cloudinaryPublicId: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  altText?: string | null;
  role?: 'main' | 'gallery';
  sortOrder?: number;
}

/* ======================== API ======================== */

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── Public Queries ─────────── */

    /**
     * GET /api/media/products/:productId/images
     * Получить изображения продукта (публичный)
     */
    getProductImages: builder.query<ProductImage[], string>({
      query: (productId) => ({
        url: `/media/products/${productId}/images`,
        method: 'GET',
      }),
      transformResponse: (res: any) => res?.images ?? res?.data ?? [],
      providesTags: (result, error, productId) => [
        { type: 'Media', id: `product-${productId}` },
      ],
    }),

    /* ─────────── Admin Queries ─────────── */

    /**
     * GET /api/admin/media
     * Получить список всех медиафайлов (admin)
     */
    getMediaList: builder.query<UploadedMedia[], { limit?: number; offset?: number } | void>({
      query: (params) => ({
        url: '/admin/media',
        method: 'GET',
        params,
      }),
      transformResponse: (res: MediaListResponse) =>
        res?.items ?? res?.media ?? res?.data ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Media' as const, id })),
              { type: 'Media', id: 'LIST' },
            ]
          : [{ type: 'Media', id: 'LIST' }],
    }),

    /**
     * GET /api/admin/media/stats
     * Получить статистику по медиа (admin)
     */
    getMediaStats: builder.query<MediaStatsResponse['stats'], void>({
      query: () => ({
        url: '/admin/media/stats',
        method: 'GET',
      }),
      transformResponse: (res: MediaStatsResponse) => res.stats,
    }),

    /**
     * GET /api/admin/media/orphaned
     * Получить список неиспользуемых медиа (admin)
     */
    getOrphanedMedia: builder.query<UploadedMedia[], void>({
      query: () => ({
        url: '/admin/media/orphaned',
        method: 'GET',
      }),
      transformResponse: (res: any) => res?.items ?? res?.media ?? res?.data ?? [],
      providesTags: [{ type: 'Media', id: 'ORPHANED' }],
    }),

    /* ─────────── Admin Mutations ─────────── */

    /**
     * POST /api/admin/media/products/:productId/images
     * Прикрепить изображение к продукту (admin)
     */
    attachImageToProduct: builder.mutation<
      AttachImageResponse,
      { productId: string } & AttachImageDto
    >({
      query: ({ productId, ...body }) => ({
        url: `/admin/media/products/${productId}/images`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Media', id: `product-${productId}` },
        { type: 'Products', id: productId },
      ],
    }),

    /**
     * PUT /api/admin/media/products/:productId/images/reorder
     * Изменить порядок изображений продукта (admin)
     */
    reorderProductImages: builder.mutation<
      void,
      { productId: string; imageIds: string[] }
    >({
      query: ({ productId, imageIds }) => ({
        url: `/admin/media/products/${productId}/images/reorder`,
        method: 'PUT',
        data: { imageIds },
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Media', id: `product-${productId}` },
        { type: 'Products', id: productId },
      ],
    }),

    /**
     * DELETE /api/admin/media/products/:productId/images/:imageId
     * Открепить изображение от продукта (admin)
     */
    removeProductImage: builder.mutation<
      void,
      { productId: string; imageId: string }
    >({
      query: ({ productId, imageId }) => ({
        url: `/admin/media/products/${productId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Media', id: `product-${productId}` },
        { type: 'Products', id: productId },
      ],
    }),

    /**
     * DELETE /api/admin/media/:id
     * Удалить медиафайл (admin)
     */
    deleteMedia: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/media/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Media', id },
        { type: 'Media', id: 'LIST' },
      ],
    }),

    /**
     * POST /api/admin/media/cleanup
     * Очистить неиспользуемые медиа (admin)
     */
    cleanupOrphanedMedia: builder.mutation<
      { success: boolean; deleted: number },
      void
    >({
      query: () => ({
        url: '/admin/media/cleanup',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Media', id: 'LIST' },
        { type: 'Media', id: 'ORPHANED' },
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // Public
  useGetProductImagesQuery,
  useLazyGetProductImagesQuery,

  // Admin queries
  useGetMediaListQuery,
  useLazyGetMediaListQuery,
  useGetMediaStatsQuery,
  useLazyGetMediaStatsQuery,
  useGetOrphanedMediaQuery,
  useLazyGetOrphanedMediaQuery,

  // Admin mutations
  useAttachImageToProductMutation,
  useReorderProductImagesMutation,
  useRemoveProductImageMutation,
  useDeleteMediaMutation,
  useCleanupOrphanedMediaMutation,
} = mediaApi;
