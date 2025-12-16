import { baseApi } from '../baseApi';
import type { CartPreview, LocalCartItem } from '@/types/cart';

export interface CheckoutPreview {
    items: Array<{
        id: string;
        productId: string;
        name: string;
        slug: string;
        imageUrl?: string;
        qty: number;
        unitPrice: string;
        lineTotal: string;
    }>;
    totals: {
        subtotal: string;
        referralDiscount: string;
        orderBase: string;
        deliveryFee: string;
        total: string;
        pvPreview: number;
        vwcPreview: string;
        freeShipping: boolean;
    };
    referralUserId?: string | null;
}

export interface CartItemDto {
    productId: string;
    quantity: number;
    product?: {
        id: string;
        name: string;
        price: number;
        images?: { mediaId: string }[];
    };
}

export interface CartResponse {
    success: boolean;
    items: CartItemDto[];
}

export const cartApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /cart
        getCart: builder.query<CartResponse, void>({
            query: () => ({ url: '/cart', method: 'GET' }),
            providesTags: ['Cart'],
        }),

        // GET /cart/preview - Получить предпросмотр корзины с расчетами
        getCartPreview: builder.query<CartPreview, void>({
            query: () => ({ url: '/cart/preview', method: 'GET' }),
            transformResponse: (res: any) => res.preview,
            providesTags: ['Cart'],
        }),

        // POST /cart/checkout-preview - Получить preview для checkout с учётом referral code
        getCheckoutPreview: builder.mutation<CheckoutPreview, { referralCode?: string }>({
            query: (body) => ({
                url: '/cart/checkout-preview',
                method: 'POST',
                data: body,
            }),
            transformResponse: (res: any) => res.preview,
        }),

        // ✅ FIX-5: POST /cart/sync - Batch синхронизация локальной корзины
        syncCart: builder.mutation<CartResponse, LocalCartItem[]>({
            query: (localItems) => ({
                url: '/cart/sync',
                method: 'POST',
                data: {
                    items: localItems.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            }),
            transformResponse: (res: any) => res.cart,
            invalidatesTags: ['Cart'],
        }),

        // POST /cart/update
        updateCart: builder.mutation<CartResponse, { action: string; product_id: string; quantity?: number }>({
            query: (body) => ({
                url: '/cart',
                method: 'POST',
                data: body,
            }),
            invalidatesTags: ['Cart'],
        }),

        clearCart: builder.mutation<{ success: boolean }, void>({
            query: () => ({
                url: '/cart',
                method: 'DELETE',
            }),
            invalidatesTags: ['Cart'],
        }),
    }),
});

export const {
    useGetCartQuery,
    useLazyGetCartQuery,
    useGetCartPreviewQuery,
    useLazyGetCartPreviewQuery,
    useGetCheckoutPreviewMutation,
    useSyncCartMutation,
    useUpdateCartMutation,
    useClearCartMutation,
} = cartApi;
