// client/src/types/cart.ts

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  categoryId?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  pvTotal?: number;
}

export interface CartTotals {
  subtotal: string;
  discount: string;
  deliveryFee: string;
  total: string;
  pvEarned: number;
  cashback: string;
}

export interface CartPreview {
  items: CartItem[];
  totals: CartTotals;
}

// СТАНДАРТИЗИРОВАННАЯ локальная структура корзины (в localStorage)
// Используется везде на фронте для единообразия
export interface LocalCartItem {
  productId: string;              // id товара (Cloudinary ID - гарантированно уникален)
  name: string;                   // название товара (title || name)
  price: number;                  // текущая цена за единицу
  originalPrice?: number | null;  // оригинальная цена (для показа скидки)
  customPv?: number | null;       // абсолютное значение PV (перезаписывает расчет)
  customCashback?: number | null; // ДОЛЯ 0..1 (0.05 = 5%), НЕ процент!
  quantity: number;               // количество в корзине
  imageUrl?: string;              // URL главного изображения (getMainProductImage)
  slug?: string;                  // slug для формирования ссылок /product/:slug
}

export interface CreateOrderInput {
  comment?: string;
  paymentMethod: 'card' | 'vwc' | 'mixed';
  deliveryAddress?: string;
  deliveryService?: 'sdek' | 'russianpost' | 'yandex';
  deliveryFeeRub?: number;
  promoCode?: string;
  idempotencyKey?: string;
}
