// Central application constants per business rules
// TS: enforced in tsconfig.

export const TIMEZONE = process.env.APP_TZ || 'Europe/Moscow';

// Referral and discounts
export const REFERRAL_DISCOUNT_RATE = 0.10; // 10%
export const CASHBACK_RATE_VWC = 0.05; // 5%

// Shipping
export const FREE_SHIPPING_THRESHOLD = 7500; // ₽
export const SHIPPING_FLAT_FEE = 500; // ₽ if not free or not overridden by delivery integration

// PV rules
export const RUB_PER_PV = 200; // 1 PV per 200 ₽ spent
export const PV_WITHDRAW_RATE = 100; // 1 PV = 100 ₽ on withdrawal

// User statuses and thresholds
export type UserStatus = 'customer' | 'partner' | 'partner_pro';
export const PARTNER_ACTIVATION_AMOUNT = 7500; // ₽
export const PARTNER_PRO_ACTIVATION_AMOUNT = 30000; // ₽

// PRO upgrade
export const PRO_UPGRADE_WINDOW_WEEKS = 5; // weeks; surcharge = difference

// Network distribution
export const NETWORK_DISTRIBUTION_RATE = 0.50; // 50% of post-discount+delivery amount goes to network per marketing plan
export const FAST_START_WEEKS = 8; // weeks
export const FAST_START_FIRST_LINE_RATE = 0.25; // 25% first line during fast start
export const POST_FAST_START_FIRST_LINE_RATE = 0.20; // 20% after fast start

// Bonuses
export const OPTION_BONUS_RATE_OF_GO = 0.03; // 3% of gross volume (ГО) via manual flag on user
export const BONUS_FOR_PARTNER = 750; // ₽
export const BONUS_FOR_PARTNER_PRO = 1250; // ₽
// "pool of first" and "infinity" bonuses require complex logic; placeholders here for shared usage
export const INFINITY_BONUS_START_LEVEL = 16; // from 16th level
export const INFINITY_BONUS_RATE_OF_GO = 0.0025; // 0.25% of GO with capping when equal leader appears below

// Referral code business rule
// User ID = Telegram ID; referral code = inviter's Telegram ID
export const REFERRAL_CODE_IS_TELEGRAM_ID = true;

// Delivery service integration toggle/placeholders
export const USE_EXTERNAL_DELIVERY_INTEGRATION = false; // if true, override SHIPPING_FLAT_FEE with integration price
