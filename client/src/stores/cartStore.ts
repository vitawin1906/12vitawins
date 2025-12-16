// client/src/stores/cartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LocalCartItem } from '@/types/cart';

/* ======================== Types ======================== */

interface CartStore {
    items: LocalCartItem[];
    isOpen: boolean;
    userId: string | null; // ✅ FIX: Храним userId для привязки корзины

    addItem: (product: {
        id: string;
        name: string;
        price: number;
        originalPrice?: number | null;
        customPv?: number | null;
        customCashback?: number | null;
        imageUrl?: string;
        slug?: string;
        stock?: number;
        quantity: number;
    }) => void;

    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    setCartOpen: (isOpen: boolean) => void;
    toggleCart: () => void;
    setUserId: (userId: string | null) => void; // ✅ FIX: Установить userId

    getTotalItems: () => number;
    getTotalPrice: () => number;
    getItemCount: (productId: string) => number;
}

/* ======================== Store ======================== */

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            userId: null, // ✅ FIX: Инициализация userId

            // ✅ FIX: Установить userId и очистить корзину если изменился пользователь
            setUserId: (newUserId: string | null) => {
                const currentUserId = get().userId;

                // Если пользователь сменился - очищаем корзину
                if (currentUserId && newUserId !== currentUserId) {
                    console.log(`🔄 User changed from ${currentUserId} to ${newUserId}, clearing cart`);
                    set({ items: [], userId: newUserId, isOpen: false });
                } else if (!currentUserId && newUserId) {
                    // Первый вход - просто устанавливаем userId
                    console.log(`👤 Setting userId: ${newUserId}`);
                    set({ userId: newUserId });
                } else if (!newUserId) {
                    // Логаут - очищаем корзину
                    console.log(`👋 Logout, clearing cart`);
                    set({ items: [], userId: null, isOpen: false });
                }
            },

            addItem: (product) => {
                const items = get().items;
                const existing = items.find((i) => i.productId === product.id);

                // Для BuyNow: если товар уже есть, не добавляем повторно
                // quantity передаётся из вызова, но если товар существует - увеличиваем
                if (existing) {
                    // Увеличиваем количество только если явно не указано quantity > 1
                    const quantityToAdd = product.quantity || 1;
                    set({
                        items: items.map((i) =>
                            i.productId === product.id
                                ? { ...i, quantity: i.quantity + quantityToAdd }
                                : i
                        ),
                    });
                } else {
                    set({
                        items: [
                            ...items,
                            {
                                productId: product.id,
                                name: product.name,
                                price: product.price,
                                originalPrice: product.originalPrice ?? null,
                                customPv: product.customPv ?? null,
                                customCashback: product.customCashback ?? null,
                                quantity: product.quantity || 1,
                                imageUrl: product.imageUrl,
                                slug: product.slug,
                            },
                        ],
                    });
                }
            },

            removeItem: (productId) => {
                set({ items: get().items.filter((i) => i.productId !== productId) });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }
                set({
                    items: get().items.map((i) =>
                        i.productId === productId ? { ...i, quantity } : i
                    ),
                });
            },

            clearCart: () => {
                set({ items: [], isOpen: false });
            },

            setCartOpen: (isOpen) => {
                set({ isOpen });
            },

            toggleCart: () => {
                set({ isOpen: !get().isOpen });
            },

            getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

            getTotalPrice: () =>
                get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

            getItemCount: (productId) =>
                get().items.find((i) => i.productId === productId)?.quantity || 0,
        }),
        {
            name: 'vitawin-cart',
            // ✅ FIX: Сохраняем items И userId
            partialize: (state) => ({ items: state.items, userId: state.userId }),
            storage: createJSONStorage(() => localStorage),
        }
    )
);

/* ======================== Selectors ======================== */

export const selectCartItems = (state: CartStore) => state.items;
export const selectCartIsOpen = (state: CartStore) => state.isOpen;
export const selectCartTotalItems = (state: CartStore) => state.getTotalItems();
export const selectCartTotalPrice = (state: CartStore) => state.getTotalPrice();
export const selectCartItemCount =
    (productId: string) => (state: CartStore) => state.getItemCount(productId);

/* ======================== Types ======================== */

export type { LocalCartItem as CartItem };
