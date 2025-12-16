import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const axiosApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
    withCredentials: true,
});

// ───────────────────────────────────────
// REQUEST INTERCEPTOR
// ───────────────────────────────────────
axiosApi.interceptors.request.use(
    (config) => {
        const store = useAuthStore.getState();

        // Нормализуем URL
        const url = config.url?.startsWith('/') ? config.url : `/${config.url}`;

        // Ставим Content-Type только если не FormData
        if (!(config.data instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        // Если нет вообще токенов → не ставим Authorization
        if (!store.accessToken && !store.adminToken) {
            delete config.headers['Authorization'];
            return config;
        }

        // ───── 1) ADMIN routes → adminToken ─────
        if (url.startsWith('/admin')) {
            if (store.adminToken) {
                config.headers['Authorization'] = `Bearer ${store.adminToken}`;
            }
            return config;
        }

        // ───── 2) USER routes → accessToken ─────
        if (store.accessToken) {
            config.headers['Authorization'] = `Bearer ${store.accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ───────────────────────────────────────
// REFRESH LOGIC (ONLY USER)
// ───────────────────────────────────────
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const store = useAuthStore.getState();
    const { refreshToken, setTokens, clearUser } = store;

    if (!refreshToken) return null;

    if (isRefreshing && refreshPromise) return refreshPromise;

    isRefreshing = true;

    const url = `${axiosApi.defaults.baseURL?.replace(/\/$/, '')}/auth/refresh`;

    refreshPromise = axios
        .post(url, { refreshToken })
        .then((resp) => {
            const { accessToken, refreshToken: newRefresh } = resp.data || {};
            if (accessToken) {
                setTokens(accessToken, newRefresh ?? undefined);
                return accessToken;
            }
            return null;
        })
        .catch((e) => {
            console.warn('Refresh failed:', e?.response?.status || e?.message);
            clearUser();
            try { window.location.href = '/'; } catch {}
            return null;
        })
        .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });

    return refreshPromise;
}

// ───────────────────────────────────────
// RESPONSE INTERCEPTOR
// ───────────────────────────────────────
axiosApi.interceptors.response.use(
    (res) => res,
    async (err) => {
        const { response, config } = err;

        // Только для user-токенов
        if (response?.status === 401 && config && !config._retry) {
            (config as any)._retry = true;

            const newAccess = await refreshAccessToken();
            if (newAccess) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${newAccess}`;
                return axiosApi(config);
            }
        }

        return Promise.reject(err);
    }
);
