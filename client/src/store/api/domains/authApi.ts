import { baseApi } from "../baseApi";
import type { User } from "@/types/user";

export interface AuthResponse {
    success: boolean;
    user: User;
    accessToken?: string;
    refreshToken?: string;
    token?: string;
    authToken?: string;
}

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
    email: string; password: string; firstName: string;
    phone?: string; referralCode?: string;
}
export interface RefreshTokenRequest { refreshToken: string; }

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ─── Queries ─────────────────────────────────────────────
        getMe: builder.query<User, void>({
            query: () => ({ url: "/auth/me", method: "GET" }),
            transformResponse: (res: any) => ("user" in res ? res.user : res),
            providesTags: ["Me"],
        }),
        getAdminMe: builder.query<User, void>({
            query: () => ({ url: "/admin/me", method: "GET" }),
            transformResponse: (res: any) => ("user" in res ? res.user : res),
            providesTags: ["Me"],
        }),

        // ─── Mutations ───────────────────────────────────────────
        register: builder.mutation<AuthResponse, RegisterRequest>({
            query: (credentials) => ({ url: "/auth/register", method: "POST", data: credentials }),
            invalidatesTags: ["Me"],
        }),
        login: builder.mutation<AuthResponse, LoginRequest>({
            query: (credentials) => ({ url: "/auth/login", method: "POST", data: credentials }),
            invalidatesTags: ["Me"],
        }),
        refreshToken: builder.mutation<AuthResponse, RefreshTokenRequest>({
            query: (data) => ({ url: "/auth/refresh", method: "POST", data }),
        }),
        telegramAuth: builder.mutation<AuthResponse, any>({
            query: (payload) => ({ url: "/auth/telegram-auth", method: "POST", data: payload }),
            invalidatesTags: ["Me"],
        }),
        telegramBotLogin: builder.mutation<AuthResponse, any>({
            query: (payload) => ({ url: "/auth/telegram-bot-login", method: "POST", data: payload }),
            invalidatesTags: ["Me"],
        }),
        // Google One Tap / ID Token
        googleIdTokenLogin: builder.mutation<AuthResponse, { idToken: string; refCode?: string }>({
            query: (body) => ({ url: "/auth/google/id-token", method: "POST", data: body }),
            invalidatesTags: ["Me"],
        }),
        logout: builder.mutation<{ success: boolean }, void>({
            query: () => ({ url: "/auth/logout", method: "POST" }),
            invalidatesTags: ["Me", "Auth"],
        }),

        // если у тебя отдельные эндпоинты логина/логаута админа — можно оставить:
        adminLogin: builder.mutation<AuthResponse, LoginRequest>({
            query: (credentials) => ({ url: "/admin/login", method: "POST", data: credentials }),
            invalidatesTags: ["Me"],
        }),
        adminLogout: builder.mutation<{ success: boolean }, void>({
            query: () => ({ url: "/admin/logout", method: "POST" }),
            invalidatesTags: ["Me", "Auth"],
        }),
        changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
            query: (data) => ({ url: "/admin/change-password", method: "POST", data }),
        }),
    }),
});

export const {
    useGetMeQuery,
    useLazyGetMeQuery,
    useGetAdminMeQuery,
    useLazyGetAdminMeQuery,
    useRegisterMutation,
    useLoginMutation,
    useRefreshTokenMutation,
    useTelegramAuthMutation,
    useTelegramBotLoginMutation,
    useGoogleIdTokenLoginMutation,
    useLogoutMutation,
    useAdminLoginMutation,
    useAdminLogoutMutation,
    useChangePasswordMutation,
} = authApi;
