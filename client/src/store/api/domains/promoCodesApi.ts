import { baseApi } from "../baseApi";
import { camelizeKeys } from "humps";

// ---------- Типы ----------

export type PromoCodeType = "percent_off" | "fixed_amount";

export interface PromoCode {
    id: string;
    code: string;
    name: string;
    type: PromoCodeType;

    percentOff?: string | null;
    fixedAmountRub?: string | null;

    minOrderRub: string;

    maxUses?: number | null;
    currentUses: number;

    onePerUser: boolean;
    isActive: boolean;

    startsAt?: string | null;
    expiresAt?: string | null;

    createdAt: string;
    updatedAt?: string;
}

export interface CreatePromoCodeInput {
    code: string;
    name: string;
    type: PromoCodeType;
    percentOff?: number;
    fixedAmountRub?: number;
    minOrderRub?: number;
    maxUses?: number;
    onePerUser?: boolean;
    isActive?: boolean;
    startsAt?: string;
    expiresAt?: string;
}

export interface UpdatePromoCodeInput {
    name?: string;
    maxUses?: number | null;
    isActive?: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
}

export interface ValidatePromoCodeInput {
    code: string;
    orderSubtotalRub: number;
}

export interface ValidatePromoCodeResult {
    valid: boolean;
    discountRub: number;
    promoCode?: {
        code: string;
        type: PromoCodeType;
        discountRub: number;
    };
}

export interface PromoCodeUsage {
    id: string;
    userId: string;
    orderId: string;
    discountRub: string;
    createdAt: string;
}

// ---------- API Slice ----------

export const promoCodesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // -------------------- ADMIN --------------------

        getPromoCodes: builder.query<
            PromoCode[],
            { limit?: number; offset?: number } | void
        >({
            query: (params) => ({
                url: "/admin/promo-codes",
                method: "GET",
                params,
            }),
            transformResponse: (response: any): PromoCode[] => {
                const list = camelizeKeys(response.promoCodes);
                return Array.isArray(list) ? (list as PromoCode[]) : [];
            },
            providesTags: ["PromoCodes"],
        }),

        createPromoCode: builder.mutation<PromoCode, CreatePromoCodeInput>({
            query: (body) => ({
                url: "/admin/promo-codes",
                method: "POST",
                body,
            }),
            transformResponse: (response: any): PromoCode =>
                camelizeKeys(response.promoCode) as PromoCode,
            invalidatesTags: ["PromoCodes"],
        }),

        updatePromoCode: builder.mutation<
            PromoCode,
            { id: string; data: UpdatePromoCodeInput }
        >({
            query: ({ id, data }) => ({
                url: `/admin/promo-codes/${id}`,
                method: "PUT",
                body: data,
            }),
            transformResponse: (response: any): PromoCode =>
                camelizeKeys(response.promoCode) as PromoCode,
            invalidatesTags: ["PromoCodes"],
        }),

        deletePromoCode: builder.mutation<{ success: boolean }, { id: string }>({
            query: ({ id }) => ({
                url: `/admin/promo-codes/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["PromoCodes"],
        }),

        getPromoCodeUsage: builder.query<
            PromoCodeUsage[],
            { id: string; limit?: number; offset?: number }
        >({
            query: ({ id, ...params }) => ({
                url: `/admin/promo-codes/${id}/usage`,
                method: "GET",
                params,
            }),
            transformResponse: (response: any): PromoCodeUsage[] => {
                const list = camelizeKeys(response.usageHistory || []);
                return Array.isArray(list) ? (list as PromoCodeUsage[]) : [];
            },
        }),

        // -------------------- USER --------------------

        validatePromoCode: builder.mutation<
            ValidatePromoCodeResult,
            ValidatePromoCodeInput
        >({
            query: (body) => ({
                url: `/promo-codes/validate`,
                method: "POST",
                body,
            }),
            transformResponse: (response: any): ValidatePromoCodeResult =>
                camelizeKeys(response) as ValidatePromoCodeResult,
        }),
    }),
});

// ---------- Hooks ----------
export const {
    useGetPromoCodesQuery,
    useCreatePromoCodeMutation,
    useUpdatePromoCodeMutation,
    useDeletePromoCodeMutation,
    useGetPromoCodeUsageQuery,
    useValidatePromoCodeMutation,
} = promoCodesApi;
