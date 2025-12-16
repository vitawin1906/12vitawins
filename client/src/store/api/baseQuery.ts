import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { axiosApi } from '@/lib/axiosApi';
import { useAuthStore } from '@/stores/authStore';

// Deeply convert snake_case object keys to camelCase
function toCamel(str: string) {
    return str.replace(/[_-](\w)/g, (_, c) => (c ? c.toUpperCase() : ''));
}
function isPlainObject(value: any) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
function camelizeKeys(input: any): any {
    if (Array.isArray(input)) return input.map(camelizeKeys);
    if (isPlainObject(input)) {
        const out: any = {};
        for (const [k, v] of Object.entries(input)) {
            out[toCamel(k)] = camelizeKeys(v);
        }
        return out;
    }
    return input;
}

export const axiosBaseQuery = (): BaseQueryFn<
    {
        url: string;
        method?: AxiosRequestConfig['method'];
        data?: any;
        params?: any;
        headers?: Record<string, string>;
    },
    unknown,
    {
        status?: number;
        data?: any;
        message?: string;
    }
> => async ({ url, method = 'GET', data, params, headers }) => {
    try {
        // ---------------------------
        // 🔥 DO NOT REMOVE THIS
        // Добавление токена из store
        // ---------------------------
        const { accessToken } = useAuthStore.getState();

        const finalHeaders: Record<string, string> = {
            ...(headers || {}),
        };

        // ✅ Один токен для всех (admin и user)
        if (accessToken) {
            finalHeaders['Authorization'] = `Bearer ${accessToken}`;
        }

        const config: AxiosRequestConfig = {
            url,
            method,
            data,
            params,
            headers: finalHeaders,
            withCredentials: true,
        };

        const res = await axiosApi.request(config);
        const transformed = camelizeKeys(res.data);

        return { data: transformed };
    } catch (error) {
        const err = error as AxiosError<any>;
        return {
            error: {
                status: err.response?.status || 500,
                data: err.response?.data,
                message: err.response?.data?.message || err.message || 'Unknown error',
            },
        };
    }
};
