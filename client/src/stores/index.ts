/**
 * Централизованный экспорт всех Zustand stores
 */

// Auth Store
export { useAuthStore, selectUser, selectIsAuthenticated, selectIsAdmin, selectIsLoading, selectCanAccessAdmin, selectIsPartner, selectUserField } from './authStore';
export type { User } from '@/types/user';

// Cart Store
export { useCartStore, selectCartItems, selectCartIsOpen, selectCartTotalItems, selectCartTotalPrice, selectCartItemCount } from './cartStore';
export type { CartItem } from './cartStore';

// UI Store
export { useUIStore, selectModals, selectToasts, selectIsLoading as selectUIIsLoading, selectLoadingText, selectSidebarOpen, selectTheme } from './uiStore';
