import { create } from 'zustand';

/* ======================== Types ======================== */

interface Modal {
  id: string;
  type: string;
  props?: Record<string, any>;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface UIStore {
  // State
  modals: Modal[];
  toasts: Toast[];
  isLoading: boolean;
  loadingText?: string;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Modals
  openModal: (type: string, props?: Record<string, any>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Toasts
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;

  // Loading
  setLoading: (isLoading: boolean, text?: string) => void;

  // Sidebar
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;

  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

/* ======================== Store ======================== */

let modalIdCounter = 0;
let toastIdCounter = 0;

/**
 * Zustand Store для UI состояния
 * - Модалки, тосты, лоадеры
 * - Sidebar состояние
 * - Тема (light/dark/system)
 */
export const useUIStore = create<UIStore>((set, get) => ({
  /* ─────────── State ─────────── */
  modals: [],
  toasts: [],
  isLoading: false,
  loadingText: undefined,
  sidebarOpen: false,
  theme: 'system',

  /* ─────────── Modals ─────────── */

  openModal: (type, props) => {
    const id = `modal-${++modalIdCounter}`;
    set({
      modals: [...get().modals, { id, type, props }],
    });
  },

  closeModal: (id) => {
    set({
      modals: get().modals.filter((m) => m.id !== id),
    });
  },

  closeAllModals: () => {
    set({ modals: [] });
  },

  /* ─────────── Toasts ─────────── */

  showToast: (message, type, duration = 5000) => {
    const id = `toast-${++toastIdCounter}`;
    const toast = { id, message, type, duration };

    set({
      toasts: [...get().toasts, toast],
    });

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set({
      toasts: get().toasts.filter((t) => t.id !== id),
    });
  },

  /* ─────────── Loading ─────────── */

  setLoading: (isLoading, text) => {
    set({ isLoading, loadingText: text });
  },

  /* ─────────── Sidebar ─────────── */

  setSidebarOpen: (isOpen) => {
    set({ sidebarOpen: isOpen });
  },

  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen });
  },

  /* ─────────── Theme ─────────── */

  setTheme: (theme) => {
    set({ theme });
    // Применяем тему к document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },
}));

/* ======================== Selectors ======================== */

export const selectModals = (state: UIStore) => state.modals;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectIsLoading = (state: UIStore) => state.isLoading;
export const selectLoadingText = (state: UIStore) => state.loadingText;
export const selectSidebarOpen = (state: UIStore) => state.sidebarOpen;
export const selectTheme = (state: UIStore) => state.theme;
