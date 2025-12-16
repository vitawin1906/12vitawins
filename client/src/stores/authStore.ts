import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/user';
import { axiosApi } from "@/lib/axiosApi";
// ✅ FIX: Импортируем cartStore для синхронизации userId
import { useCartStore } from './cartStore';

/* ======================== Types ======================== */

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;

    accessToken: string | null;
    refreshToken: string | null;

    // ★ Добавлено: безопасно, не ломает типы
    isHydrated: boolean;

    setUser: (user: User | null) => void;
    clearUser: () => void;
    updateUser: (updates: Partial<User>) => void;

    setTokens: (accessToken: string | null, refreshToken?: string | null) => void;

    clearTokens: () => void;
    getAccessToken: () => string | null;

    isPartner: () => boolean;
    canAccessAdmin: () => boolean;
}

/* ======================== Store ======================== */

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,

            accessToken: null,
            refreshToken: null,

            // ★ Из нового
            isHydrated: false,

            setUser: (user) => {
                set({
                    user,
                    isAuthenticated: !!user,
                    isAdmin: user?.isAdmin || false,
                });

                // ✅ FIX: Синхронизируем userId с cartStore
                useCartStore.getState().setUserId(user?.id || null);
            },

            clearUser: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    isAdmin: false,
                    accessToken: null,
                    refreshToken: null,
                });

                try {
                    localStorage.removeItem('auth-storage');
                } catch {}

                delete axiosApi.defaults.headers.common['Authorization'];

                // ✅ FIX: Очищаем корзину при логауте
                useCartStore.getState().setUserId(null);
            },

            updateUser: (updates) => {
                const currentUser = get().user;
                if (!currentUser) return;

                const updated = { ...currentUser, ...updates };

                set({
                    user: updated,
                    isAdmin: updated.isAdmin || false,
                });
            },

            setTokens: (accessToken, refreshToken) => {
                set({
                    accessToken,
                    refreshToken: refreshToken ?? get().refreshToken,
                });
            },

            clearTokens: () => {
                set({
                    accessToken: null,
                    refreshToken: null,
                });
            },

            getAccessToken: () => get().accessToken,

            isPartner: () => {
                const { user } = get();
                return (
                    user?.mlmStatus === 'partner' ||
                    user?.mlmStatus === 'partner_pro'
                );
            },

            canAccessAdmin: () => {
                const { user, isAuthenticated } = get();
                return isAuthenticated && user?.isAdmin === true;
            },
        }),

        {
            name: 'auth-storage',

            // ★ Правильный безопасный hydrate callback НЕ ломает типы
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isHydrated = true;
                }
            },

            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                user: state.user,
            }),
        }
    )
);

/* ======================== Selectors ======================== */

export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsAdmin = (state: AuthStore) => state.isAdmin;
export const selectIsLoading = (state: AuthStore) => state.isLoading;

export const selectCanAccessAdmin = (state: AuthStore) => state.canAccessAdmin();
export const selectIsPartner = (state: AuthStore) => state.isPartner();

// ★ Новый селектор
export const selectIsHydrated = (state: AuthStore) => state.isHydrated;

export const selectUserField = <K extends keyof User>(field: K) =>
    (state: AuthStore) => state.user?.[field];
