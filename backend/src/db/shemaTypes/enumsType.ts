import { z } from 'zod';

/** Валюты */
export const Currency = z.enum(['RUB', 'PV', 'VWC']);
export type Currency = z.infer<typeof Currency>;

/** MLM-статусы и ранги */
export const MlmStatus = z.enum(['customer', 'partner', 'partner_pro']);
export type MlmStatus = z.infer<typeof MlmStatus>;

export const MlmRank = z.enum(['member', 'лидер', 'создатель']);
export type MlmRank = z.infer<typeof MlmRank>;

/** Статусы заказа (канон) */
export const OrderStatus = z.enum([
    'created',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'returned',
    'canceled',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

/** Доставка */
export const DeliveryStatus = z.enum(['not_required', 'pending', 'in_transit', 'delivered', 'lost', 'returned']);
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;

/** Оплата */
export const PaymentMethod = z.enum(['card', 'vwc']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const PaymentStatus = z.enum(['init', 'awaiting', 'authorized', 'captured', 'refunded', 'failed']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

/** Леджер: виды операций (Приложение C) */
export const LedgerOpType = z.enum([
    'order_accrual',
    'refund',
    'fast_start',
    'infinity',
    'option_bonus',
    'activation_bonus',
    'first_pool',
    'airdrop',
    'achievement',
    'adjustment',
    'withdrawal_request',
    'withdrawal_payout',
]);
export type LedgerOpType = z.infer<typeof LedgerOpType>;

/** Типы счётов и владение */
export const AccountType = z.enum(['cash_rub', 'pv', 'vwc', 'referral', 'reserve_special', 'network_fund']);
export type AccountType = z.infer<typeof AccountType>;

export const OwnerType = z.enum(['user', 'system']);
export type OwnerType = z.infer<typeof OwnerType>;

/** Скидки/купоны */
export const DiscountType = z.enum(['line_item', 'cart_fixed', 'cart_percent', 'referral_10']);
export type DiscountType = z.infer<typeof DiscountType>;

/** UI/интеграции */
export const UiStatus = z.enum(['active', 'inactive']);
export type UiStatus = z.infer<typeof UiStatus>;

export const ProductStatus = z.enum(['active', 'draft', 'archived']);
export type ProductStatus = z.infer<typeof ProductStatus>;

export const DeliveryService = z.enum(['sdek', 'russianpost', 'yandex']);
export type DeliveryService = z.infer<typeof DeliveryService>;

/** Для карточек БАД (UI) */
export const HowToTake = z.enum(['morning', 'morning_evening', 'with_meals', 'before_meals', 'custom']);
export type HowToTake = z.infer<typeof HowToTake>;
export const AddressType = z.enum(['home', 'work']);
export type AddressType = z.infer<typeof AddressType>;

export const BlogStatus = z.enum(['published', 'draft']);
export type BlogStatus = z.infer<typeof BlogStatus>;