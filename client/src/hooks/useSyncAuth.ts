// src/hooks/useSyncAuth.ts
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGetMeQuery } from "@/store/api/domains";

type SyncAuthState = { isLoading: boolean; isError: boolean; error: unknown };

export function useSyncAuth(): SyncAuthState {
    // ✅ Ждём пока store загрузит токены из localStorage
    const isHydrated = useAuthStore((state) => state.isHydrated);
    const hasToken = useAuthStore((state) => !!state.accessToken);

    // ✅ Запрос делаем ТОЛЬКО после гидрации store
    const {
        data: me,
        isSuccess,
        isError,
        isLoading,
        isFetching,
        isUninitialized,
        error,
    } = useGetMeQuery(undefined, {
        skip: !isHydrated, // ⚡ Пропускаем пока store не загружен
        refetchOnMountOrArgChange: false,
        refetchOnFocus: false,
        refetchOnReconnect: true,
    });

    useEffect(() => {
        if (isSuccess && me) {
            useAuthStore.setState({
                user: me,
                isAdmin: me.isAdmin || false,
                isAuthenticated: true,
            });
        }

        // ✅ Очищаем user ТОЛЬКО если store уже гидрирован
        // (иначе можем случайно очистить до загрузки токена)
        if (isError && isHydrated) {
            useAuthStore.setState({
                user: null,
                isAdmin: false,
                isAuthenticated: false,
            });
        }
    }, [isSuccess, isError, me, isHydrated]);

    return {
        // ✅ Добавляем !isHydrated в isLoading
        isLoading: !isHydrated || isLoading || isFetching || isUninitialized,
        isError,
        error,
    };
}

