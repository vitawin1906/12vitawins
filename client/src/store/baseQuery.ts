// client/src/store/baseQuery.ts
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { axiosApi } from '@/lib/axiosApi';
import type { RootState } from '@/store'; // убедитесь в пути

export interface AxiosBaseQueryArgs {
    url: string;
    method?: AxiosRequestConfig['method'];
    data?: AxiosRequestConfig['data'];
    params?: AxiosRequestConfig['params'];
    headers?: AxiosRequestConfig['headers'];
}

type RtkError = { status: number; data: any; message?: string };

export const axiosBaseQuery =
    (): BaseQueryFn<AxiosBaseQueryArgs, unknown, RtkError> =>
        async ({ url, method = 'GET', data, params, headers = {} }, api) => {
            try {
                const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

                // ❌ НЕ используем токен из state - мы работаем с HttpOnly cookies!
                // Cookies автоматически отправляются браузером при withCredentials: true

                const config: AxiosRequestConfig = {
                    url,
                    method,
                    data,
                    params,
                    withCredentials: true, // ✅ HttpOnly cookie аутентификация
                    signal: api.signal,
                };

                // Для FormData НЕ передаём headers вообще — axios проставит всё сам
                if (!isFormData) {
                    config.headers = { ...headers };
                }
                // Для FormData headers не нужны - axios автоматически установит
                // правильный Content-Type с boundary

                const res = await axiosApi.request(config);
                return { data: res.data };
            } catch (e) {
                const err = e as AxiosError<any>;
                const status = err.response?.status ?? 0; // 0 = network/CORS
                return {
                    error: {
                        status,
                        data: err.response?.data ?? null,
                        message: err.message || 'Request failed',
                    },
                };
            }
        };
