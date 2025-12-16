// src/hooks/useSyncAuth.ts
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGetMeQuery } from "@/store/api/domains";

type SyncAuthState = { isLoading: boolean; isError: boolean; error: unknown };

export function useSyncAuth(): SyncAuthState {
    // ✅ ВСЕГДА делаем запрос при загрузке приложения
    // Backend проверит cookie authToken, даже если в store нет accessToken
    const {
        data: me,
        isSuccess,
        isError,
        isLoading,
        isFetching,
        isUninitialized,
        error,
    } = useGetMeQuery(undefined, {
        skip: false, // ✅ НЕ пропускаем - всегда проверяем
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

        if (isError) {
            useAuthStore.setState({
                user: null,
                isAdmin: false,
                isAuthenticated: false,
            });
        }
    }, [isSuccess, isError, me]);

    return {
        isLoading: isLoading || isFetching || isUninitialized,
        isError,
        error,
    };
}
