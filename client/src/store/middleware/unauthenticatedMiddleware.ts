// client/src/store/middleware/unauthenticatedMiddleware.ts
import { isRejectedWithValue, Middleware, AnyAction } from '@reduxjs/toolkit';

type ApiError = { status: number; data?: unknown; message?: string };

function hasStatus(payload: unknown): payload is ApiError {
    return (
        !!payload &&
        typeof payload === 'object' &&
        'status' in (payload as Record<string, unknown>) &&
        typeof (payload as any).status === 'number'
    );
}

/**
 * Глобальная обработка 401/403 (но не сетевых ошибок status=0)
 * Делает редирект на /admin/login только при реальной потере авторизации.
 */
export const unauthenticatedMiddleware: Middleware = (api) => (next) => (action: unknown) => {
    const anyAction = action as AnyAction;

    if (isRejectedWithValue(anyAction)) {
        const payload = (anyAction as any).payload as unknown;

        // Поддерживаем две формы: { status } и { error: { status } }
        const candidate = hasStatus(payload)
            ? payload
            : hasStatus((payload as any)?.error)
                ? (payload as any).error
                : undefined;

        const status = candidate?.status;

        // 0 — сеть/CORS: НЕ редиректим
        if ((status === 401 || status === 403) && !window.location.pathname.includes('/admin/login')) {
            console.warn('Unauthorized/Forbidden, redirecting to /admin/login');
            // api.dispatch(logout()); // если нужен логаут стора — раскомментируй
            window.location.href = '/admin/login';
        }
    }

    return next(anyAction);
};
