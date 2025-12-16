import { pgEnum } from 'drizzle-orm/pg-core';

/** Валюта проекта */
export const currencyEnum = pgEnum('currency', ['RUB', 'VWC', 'PV']);

export const orderStatusEnum = pgEnum('order_status', [
    'new','pending','paid','shipped','delivered','canceled','returned_partial','returned_full',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
    'not_required','pending','in_transit','delivered','lost','returned',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
    'card','sbp','wallet','cash','promo', // 'mixed' removed - not implemented
]);

export const paymentStatusEnum = pgEnum('payment_status', [
    'init','awaiting','authorized','captured','refunded','failed',
]);

/** MLM статусы / ранги */
export const mlmStatusEnum = pgEnum('mlm_status', ['customer', 'partner', 'partner_pro']);
export const mlmRankEnum   = pgEnum('mlm_rank',   ['member', 'лидер', 'создатель']);

/** Леджер / счета / владельцы / скидки */
export const ledgerOpTypeEnum = pgEnum('ledger_op_type', [
    'order_accrual','order_payment','refund','reward','transfer',
    'fast_start','infinity','option_bonus','activation_bonus',
    'first_pool','airdrop','achievement','adjustment',
    'withdrawal_request','withdrawal_payout',
    'cashback','network_bonus','referral_bonus','network_fund_allocation',
]);

export const accountTypeEnum = pgEnum('account_type', [
    'cash_rub','pv','vwc','referral','reserve_special','network_fund',
]);

export const ownerTypeEnum    = pgEnum('owner_type', ['user','system']);
export const discountTypeEnum = pgEnum('discount_type', ['line_item','cart_fixed','cart_percent','referral_10']);

/** UI / Каталог / Доставка / Блог / Адреса / RBAC */
export const uiStatusEnum        = pgEnum('ui_status', ['active','inactive']);
export const productStatusEnum   = pgEnum('product_status', ['active','draft','archived']);
export const deliveryServiceEnum = pgEnum('delivery_service', ['sdek','russianpost','yandex']);
export const blogStatusEnum      = pgEnum('blog_status', ['published','draft']);
export const addressTypeEnum     = pgEnum('address_type', ['home','work']);
export const rbacRoleEnum        = pgEnum('rbac_role', ['admin','finance','support','editor']);

/** Вывод средств */
export const withdrawalStatusEnum = pgEnum('withdrawal_status', [
    'requested','in_review','approved','rejected','paid','canceled',
]);

/** Fast Start — точка старта окна */
export const fastStartPointEnum = pgEnum('fast_start_point', [
    'registration','first_paid','activation',
]);

/** Категории */
export const categoryStatusEnum = pgEnum('category_status', ['active','inactive']);

/** Airdrop: тип проверки */
export const airdropCheckTypeEnum = pgEnum('airdrop_check_type', [
    'tg_channel_sub','custom',
]);

/** 🔥 Airdrop: ТРИГГЕР (ТО, ЧЕГО НЕ ХВАТАЛО!) */
export const airdropTriggerEnum = pgEnum('airdrop_trigger', [
    'tg_channel_sub',
    'custom',
]);

/** Уведомления */
export const notificationChannelEnum = pgEnum('notification_channel', [
    'email','telegram','push',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
    'pending','sent','failed',
]);

export const notificationEventEnum = pgEnum('notification_event', [
    'order_created',
    'order_paid',
    'order_shipped',
    'withdrawal_requested',
    'withdrawal_approved',
    'airdrop_completed',
]);
