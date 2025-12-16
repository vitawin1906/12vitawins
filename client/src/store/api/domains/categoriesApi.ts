import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: 'active' | 'inactive' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  productCount?: number;
}

export interface CategoryListQuery {
  q?: string;
  status?: string;
  orderBy?: 'name_asc' | 'name_desc' | 'created_asc' | 'created_desc';
  limit?: number;
  offset?: number;
}

/* ======================== API ======================== */

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── Public Queries ─────────── */

    /**
     * GET /api/categories
     * Получить список категорий (публичный)
     */
    getPublicCategories: builder.query<Category[], CategoryListQuery | void>({
      query: (params) => ({
        url: '/categories',
        method: 'GET',
        params,
      }),
      transformResponse: (res: any): Category[] => {
        if (Array.isArray(res)) return res;
        return res?.categories ?? res?.data ?? [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Categories' as const, id })),
              { type: 'Categories', id: 'PUBLIC_LIST' },
            ]
          : [{ type: 'Categories', id: 'PUBLIC_LIST' }],
    }),

    /**
     * GET /api/categories/:slug
     * Получить категорию по slug (публичный)
     */
    getPublicCategoryBySlug: builder.query<Category, string>({
      query: (slug) => ({
        url: `/categories/${slug}`,
        method: 'GET',
      }),
      transformResponse: (res: any) => res.category || res.data || res,
      providesTags: (result) =>
        result ? [{ type: 'Categories', id: result.id }] : [],
    }),

    /* ─────────── Admin Queries ─────────── */

    /**
     * GET /api/admin/categories
     * Получить все категории (админ)
     */
    getAdminCategories: builder.query<Category[], CategoryListQuery | void>({
      query: (params) => ({
        url: '/admin/categories',
        method: 'GET',
        params,
      }),
      transformResponse: (res: any): Category[] => {
        if (Array.isArray(res)) return res;
        return res?.categories ?? res?.data ?? [];
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Categories' as const, id })),
              { type: 'Categories', id: 'ADMIN_LIST' },
            ]
          : [{ type: 'Categories', id: 'ADMIN_LIST' }],
    }),

    /* ─────────── Admin Mutations ─────────── */

    /**
     * POST /api/admin/categories
     * Создать категорию
     */
    createCategory: builder.mutation<Category, Partial<Category>>({
      query: (category) => ({
        url: '/admin/categories',
        method: 'POST',
        data: category,
      }),
      transformResponse: (res: any) => res.category || res.data || res,
      invalidatesTags: [
        { type: 'Categories', id: 'ADMIN_LIST' },
        { type: 'Categories', id: 'PUBLIC_LIST' },
      ],
    }),

    /**
     * PUT /api/admin/categories/:id
     * Обновить категорию
     */
    updateCategory: builder.mutation<Category, { id: string; body: Partial<Category> }>({
      query: ({ id, body }) => ({
        url: `/admin/categories/${id}`,
        method: 'PUT',
        data: body,
      }),
      transformResponse: (res: any) => res.category || res.data || res,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Categories', id },
        { type: 'Categories', id: 'ADMIN_LIST' },
        { type: 'Categories', id: 'PUBLIC_LIST' },
      ],
    }),

    /**
     * PATCH /api/admin/categories/:id
     * Частично обновить категорию
     */
    patchCategory: builder.mutation<Category, { id: string; body: Partial<Category> }>({
      query: ({ id, body }) => ({
        url: `/admin/categories/${id}`,
        method: 'PATCH',
        data: body,
      }),
      transformResponse: (res: any) => res.category || res.data || res,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Categories', id },
        { type: 'Categories', id: 'ADMIN_LIST' },
        { type: 'Categories', id: 'PUBLIC_LIST' },
      ],
    }),

    /**
     * DELETE /api/admin/categories/:id
     * Удалить категорию
     */
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Categories', id },
        { type: 'Categories', id: 'ADMIN_LIST' },
        { type: 'Categories', id: 'PUBLIC_LIST' },
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // Public
  useGetPublicCategoriesQuery,
  useLazyGetPublicCategoriesQuery,
  useGetPublicCategoryBySlugQuery,
  useLazyGetPublicCategoryBySlugQuery,

  // Admin
  useGetAdminCategoriesQuery,
  useLazyGetAdminCategoriesQuery,

  // Mutations
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  usePatchCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
