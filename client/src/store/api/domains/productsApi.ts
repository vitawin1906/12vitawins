import { baseApi } from "../baseApi";
import {
    normalizeProductFromApi,
    normalizeProductsFromApi,
    denormalizeProductToApi
} from '@/utils/products/normalize';

/* ======================== Types ======================== */

/**
 * Product interface для фронтенда
 *
 * КРИТИЧЕСКИ ВАЖНО:
 * - customCashback на фронтенде хранится как ДОЛИ (0..1)
 * - Backend отдает ПРОЦЕНТЫ (0..100), нормализация в transformResponse
 * - При отправке на backend конвертируем обратно в ПРОЦЕНТЫ через denormalizeProductToApi
 *
 * Пример: БД 5.00% → API 5.00 → normalize → Frontend 0.05 → denormalize → API 5.00 → БД 5.00%
 */
export interface Product {
    id: string;
    name: string;
    slug: string;
    title?: string;
    description?: string;
    longDescription?: string;
    price: number;
    originalPrice?: number | null;

    // Category (ID в БД + JOIN-объект после attachCategory())
    categoryId: string;
    category?: { id: string; name: string; slug: string } | null;

    // Images из БД (JSONB массив)
    images: Array<{
        mediaId: string;            // Cloudinary URL или media ID
        role: "main" | "gallery";   // роль картинки
        alt?: string;               // alt текст
        sortOrder: number;          // порядок отображения
    }>;

    badge?: string;
    benefits?: string[];
    rating?: number;
    reviews?: number;
    stock: number;
    status: "active" | "inactive" | "draft" | "archived";
    uiStatus?: "active" | "inactive";
    sku?: string;
    composition?: Record<string, any>;
    usage?: string;
    additionalInfo?: string;
    capsuleCount?: number;
    capsuleVolume?: string;
    servingsPerContainer?: number;
    manufacturer?: string;
    countryOfOrigin?: string;
    expirationDate?: string;
    storageConditions?: string;
    howToTake?: string;

    // SEO поля
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;

    // ═══ БОНУСЫ (критично!) ═══
    /** Участвует ли товар в начислении PV баллов */
    isPvEligible?: boolean;

    /** Кастомные PV баллы (если null, используется расчет от цены) */
    customPv?: number | null;

    /**
     * Кастомный процент кэшбэка как ДОЛЯ (0..1)
     * ⚠️ КРИТИЧНО: На фронтенде хранится как доля (0.05 = 5%)
     * Backend хранит как проценты (5.00 = 5%)
     * Конвертация происходит в normalize/denormalize
     */
    customCashback?: number | null;

    createdAt?: string;
    updatedAt?: string;
}

export interface ProductsResponse {
    success: boolean;
    products?: Product[];
    data?: Product[];
    total?: number;
}

export interface ProductResponse {
    success: boolean;
    product?: Product;
    data?: Product;
}

export interface ProductListQuery {
    q?: string;
    status?: string;
    uiStatus?: string;
    category?: string;
    limit?: number;
    offset?: number;
}

/* ======================== API ======================== */

export const productsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /* ─────────── Public Queries ─────────── */

        // GET /api/products — публичный список
        getPublicProducts: builder.query<Product[], ProductListQuery | void>({
            query: (params) => ({
                url: "/products",
                method: "GET",
                params,
            }),
            transformResponse: (res: any): Product[] => {
                // Извлекаем массив из разных форматов ответа
                let rawArray: any[] = [];
                if (Array.isArray(res)) {
                    rawArray = res;
                } else {
                    rawArray = res?.products ?? res?.data ?? [];
                }

                // Нормализуем данные: customCashback 0-100 → 0-1
                return normalizeProductsFromApi(rawArray);
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: "Products" as const, id })),
                        { type: "Products" as const, id: "PUBLIC_LIST" },
                    ]
                    : [{ type: "Products" as const, id: "PUBLIC_LIST" }],
        }),

        // GET /api/products/:id или /api/products/slug/:slug — публичный по id или slug
        getPublicProduct: builder.query<Product, string>({
            query: (identifier) => {
                const isUuid =
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

                return {
                    url: isUuid
                        ? `/products/${identifier}`           // GET by ID
                        : `/products/slug/${identifier}`,    // GET by slug
                    method: "GET",
                };
            },
            transformResponse: (res: ProductResponse) => {
                const rawProduct = res.product || res.data;
                if (!rawProduct) throw new Error("Product not found in response");
                return normalizeProductFromApi(rawProduct);
            },
        }),
        /* ─────────── Admin Queries ─────────── */

        // GET /api/admin/products — админский список
        getAdminProducts: builder.query<Product[], ProductListQuery | void>({
            query: (params) => ({
                url: "/admin/products",
                method: "GET",
                params,
            }),
            transformResponse: (res: any): Product[] => {
                // Извлекаем массив из разных форматов ответа
                let rawArray: any[] = [];
                if (Array.isArray(res)) {
                    rawArray = res;
                } else {
                    rawArray = res?.products ?? res?.data ?? [];
                }

                // Нормализуем данные: customCashback 0-100 → 0-1
                return normalizeProductsFromApi(rawArray);
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: "Products" as const, id })),
                        { type: "Products" as const, id: "ADMIN_LIST" },
                    ]
                    : [{ type: "Products" as const, id: "ADMIN_LIST" }],
        }),

        // GET /api/admin/products/:id — админский по id
        getAdminProduct: builder.query<Product, string>({
            query: (id) => ({
                url: `/admin/products/${id}`,
                method: "GET",
            }),
            transformResponse: (res: ProductResponse) => {
                const rawProduct = res.product || res.data;
                if (!rawProduct) {
                    throw new Error('Product not found in response');
                }
                // Нормализуем данные: customCashback 0-100 → 0-1
                return normalizeProductFromApi(rawProduct);
            },
            providesTags: (result, _e, id) => [{ type: "Products" as const, id }],
        }),

        /* ─────────── Admin Mutations ─────────── */

        // POST /api/admin/products — создать
        createProduct: builder.mutation<Product, Partial<Product>>({
            query: (product) => {
                // Денормализуем данные перед отправкой: customCashback 0-1 → 0-100
                const denormalizedProduct = denormalizeProductToApi(product);

                return {
                    url: "/admin/products",
                    method: "POST",
                    data: denormalizedProduct, // если baseApi на axios; для fetchBaseQuery заменить на body
                };
            },
            transformResponse: (res: ProductResponse) => {
                const rawProduct = res.product || res.data;
                if (!rawProduct) {
                    throw new Error('Product not created - no data in response');
                }
                // Нормализуем ответ: customCashback 0-100 → 0-1
                return normalizeProductFromApi(rawProduct);
            },
            invalidatesTags: [
                { type: "Products" as const, id: "ADMIN_LIST" },
                { type: "Products" as const, id: "PUBLIC_LIST" },
            ],
        }),

        // PUT /api/admin/products/:id — обновить
        updateProduct: builder.mutation<Product, { id: string } & Partial<Product>>({
            query: ({ id, ...product }) => {
                // Денормализуем данные перед отправкой: customCashback 0-1 → 0-100
                const denormalizedProduct = denormalizeProductToApi(product);

                return {
                    url: `/admin/products/${id}`,
                    method: "PUT",
                    data: denormalizedProduct, // для fetchBaseQuery => body
                };
            },
            transformResponse: (res: ProductResponse) => {
                const rawProduct = res.product || res.data;
                if (!rawProduct) {
                    throw new Error('Product not updated - no data in response');
                }
                // Нормализуем ответ: customCashback 0-100 → 0-1
                return normalizeProductFromApi(rawProduct);
            },
            invalidatesTags: (_r, _e, { id }) => [
                { type: "Products" as const, id },
                { type: "Products" as const, id: "ADMIN_LIST" },
                { type: "Products" as const, id: "PUBLIC_LIST" },
            ],
        }),

        // DELETE /api/admin/products/:id — удалить
        deleteProduct: builder.mutation<void, string>({
            query: (id) => ({
                url: `/admin/products/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, id) => [
                { type: "Products" as const, id },
                { type: "Products" as const, id: "ADMIN_LIST" },
                { type: "Products" as const, id: "PUBLIC_LIST" },
            ],
        }),
    }),
});

/* ======================== Hooks ======================== */

export const {
    // Public
    useGetPublicProductsQuery,
    useLazyGetPublicProductsQuery,
    useGetPublicProductQuery,
    useLazyGetPublicProductQuery,

    // Admin
    useGetAdminProductsQuery,
    useLazyGetAdminProductsQuery,
    useGetAdminProductQuery,
    useLazyGetAdminProductQuery,

    // Mutations
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
} = productsApi;
