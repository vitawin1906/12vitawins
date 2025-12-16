// client/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';

// Импортируем все domain APIs для регистрации endpoints
import './api/domains/authApi';
import './api/domains/productsApi';
import './api/domains/categoriesApi';
import './api/domains/ordersApi';
import './api/domains/statsApi';
import './api/domains/blogApi';
import './api/domains/usersApi';
import './api/domains/mediaApi';
import './api/domains/withdrawalApi';
import './api/domains/bonusApi';
import './api/domains/mlmApi';
import './api/domains/cartApi';
import './api/domains/settingsApi';

/**
 * Redux store ТОЛЬКО для RTK Query
 * - БЕЗ Redux slices (всё состояние в Zustand)
 * - Единый baseApi для всех endpoints
 * - Cookie-based аутентификация
 * - Automatic refetch on focus/reconnect
 */
export const store = configureStore({
  reducer: {
    // Только RTK Query
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

// Включаем автоматический refetch при focus/reconnect
setupListeners(store.dispatch);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
