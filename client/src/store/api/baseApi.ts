import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * Единый базовый API для всего приложения
 * - Все домены (auth, products, orders и т.д.) инжектятся через injectEndpoints
 * - Cookie-based аутентификация (withCredentials: true)
 * - Централизованное кеширование и инвалидация тегов
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Auth',
    'Me',
    'Users',
    'Products',
    'Categories',
    'Orders',
    'OrderItems',
    'Media',
    'Blog',
    'Stats',
    'Cart',
    'Mlm',
    'Settings',
    'Ledger',
    'Address',
    'Review',
    'PromoCodes',
    'PromoCodeUsage',
    'FreedomShares',
    'Matrix',
    'NetworkFund',
    'Payment',
    'Gamification',
    'Rank',
    'ActivationPackage',
  ],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30, // 30 секунд
  keepUnusedDataFor: 60, // 60 секунд для MLM системы (быстрые изменения данных)
  endpoints: () => ({}), // Endpoints будут добавлены через injectEndpoints
});

export default baseApi;
