// client/src/utils/orders/normalize.ts

export type ApiMoney = string | number | null | undefined;

function toNumber(m: ApiMoney): number {
  if (m === null || m === undefined) return 0;
  if (typeof m === 'number') return m;
  const n = Number(m);
  return Number.isFinite(n) ? n : 0;
}

// UI types expected by admin components
export interface UiOrderItem {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  productSlug?: string;
  quantity: number; // from qty
  price: number;    // from unitPriceRub (MoneyString)
  total: number;    // from lineTotalRub (MoneyString)
}

export type UiOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'new';

export interface UiOrder {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  status: UiOrderStatus;
  deliveryStatus?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | string;
  totalAmount: number; // from totalPayableRub
  items: UiOrderItem[];
  shippingAddress?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string;

  // ✅ Бонусные поля (начисляются при delivered)
  pvEarned?: number; // Personal Volume (1 PV = 200₽)
  vwcCashback?: number; // VWC кэшбек (5% от order_base)
  orderBaseRub?: number; // База для расчёта бонусов (subtotal - discounts)
  networkFundRub?: number; // В фонд сети (50% от order_base)

  // Детализация суммы заказа
  itemsSubtotalRub?: number; // Сумма товаров
  discountTotalRub?: number; // Скидки
  deliveryFeeRub?: number; // Доставка
}

// Accept a variety of API order shapes and convert to UI order
export function normalizeOrderFromApi(api: any): UiOrder {
  if (!api || typeof api !== 'object') {
    // create an empty safe object to avoid UI crashes
    return {
      id: '',
      status: 'pending',
      totalAmount: 0,
      items: [],
      createdAt: new Date().toISOString(),
    } as UiOrder;
  }

  const items: UiOrderItem[] = Array.isArray(api.items)
    ? api.items.map((i: any) => ({
        id: String(i.id ?? ''),
        productId: String(i.productId ?? ''),
        productName: i.productName ?? undefined,
        productImage: i.productImage ?? undefined,
        productSlug: i.productSlug ?? undefined,
        quantity: Number(i.quantity ?? i.qty ?? 0),
        price: toNumber(i.price ?? i.unitPriceRub),
        total: toNumber(i.total ?? i.lineTotalRub),
      }))
    : [];

  // Prefer camelCase common fields; fallback to backend names
  const id = String(api.id ?? '');
  const status: UiOrderStatus = (api.status ?? 'pending') as UiOrderStatus;
  const deliveryStatus = api.deliveryStatus ?? undefined;
  const paymentStatus = api.paymentStatus ?? undefined;

  const totalAmount = toNumber(
    api.totalAmount ?? api.totalPayableRub ?? api.total ?? api.total_payable,
  );

  const createdAt = String(api.createdAt ?? api.created_at ?? new Date().toISOString());
  const updatedAt = api.updatedAt ?? api.updated_at ?? undefined;
  const deliveredAt = api.deliveredAt ?? api.delivered_at ?? undefined;

  return {
    id,
    userId: api.userId ?? api.user_id ?? undefined,
    userName: api.userName ?? api.user_name ?? undefined,
    userEmail: api.userEmail ?? api.user_email ?? undefined,
    status,
    deliveryStatus,
    paymentStatus,
    totalAmount,
    items,
    shippingAddress: api.shippingAddress ?? api.deliveryAddress ?? undefined,
    paymentMethod: api.paymentMethod ?? undefined,
    createdAt,
    updatedAt: updatedAt ? String(updatedAt) : undefined,
    deliveredAt: deliveredAt ? String(deliveredAt) : undefined,

    // ✅ Бонусные поля
    pvEarned: api.pvEarned ?? undefined,
    vwcCashback: toNumber(api.vwcCashback),
    orderBaseRub: toNumber(api.orderBaseRub),
    networkFundRub: toNumber(api.networkFundRub),

    // Детализация
    itemsSubtotalRub: toNumber(api.itemsSubtotalRub),
    discountTotalRub: toNumber(api.discountTotalRub),
    deliveryFeeRub: toNumber(api.deliveryFeeRub),
  };
}

// Accept various envelopes from backend and return a UI list
export function normalizeOrdersList(payload: any): UiOrder[] {
  // Common envelopes we may see:
  // { success, orders: [...] }
  // { success, items: [...] }
  // { success, data: [...] }
  // direct array [...]
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.orders)
    ? payload.orders
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.items)
    ? payload.data.items
    : [];

  return arr.map((o: any) => normalizeOrderFromApi(o));
}
