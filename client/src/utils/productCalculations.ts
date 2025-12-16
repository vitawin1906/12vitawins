// client/src/utils/productCalculations.ts

/**
 * Минималистичные расчёты для карточки товара.
 * Главное: используем значения из БД (customPv/customCashback), а не "настраиваемые проценты" на фронте.
 * Фронт лишь форматирует и подставляет дефолты, если в БД пусто.
 *
 * ВАЖНО: customCashback приходит с бэкенда как ДОЛЯ (0..1), а не процент!
 * Например: 0.05 = 5%, 0.10 = 10%
 */

type MoneyLike = number | string | null | undefined;

export type CalcInput = {
    price: MoneyLike;                // текущее
    originalPrice?: MoneyLike;       // было
    customPv?: number | null;        // из БД (PV в штуках, абсолютное значение)
    customCashback?: number | null;  // из БД (ДОЛЯ 0..1, не процент!)
};

export type CalcResult = {
    price: number;
    originalPrice: number;
    formattedPrice: string;
    formattedOriginalPrice: string;
    discountPercentage: number;
    savings: number;
    hasDiscount: boolean;

    // бонусы: сначала берём из БД; если нет — считаем по дефолту
    bonusCoins: number;   // == PV
    cashback: number;     // рубли
};

const DEFAULT_CASHBACK_FRACTION = 0.05;   // 5% если в БД нет customCashback
const PV_PRICE_DIVIDER = 200;             // 1 PV за каждые 200 ₽, если в БД нет customPv

/* -------------------------- helpers -------------------------- */

export function toNumberSafe(v: MoneyLike): number {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (!v) return 0;
    const n = Number.parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

export function formatPriceRU(v: MoneyLike, currency = "₽"): string {
    const n = toNumberSafe(v);
    // Округляем до целого для отображения
    return `${Math.round(n).toLocaleString("ru-RU")} ${currency}`;
}

export function calcDiscountPercentage(original: MoneyLike, current: MoneyLike): number {
    const o = toNumberSafe(original);
    const c = toNumberSafe(current);
    if (!o || c >= o) return 0;
    return Math.round(((o - c) / o) * 100);
}

export function calcSavings(original: MoneyLike, current: MoneyLike): number {
    const o = toNumberSafe(original);
    const c = toNumberSafe(current);
    return Math.max(0, o - c);
}

/* ---------------------- main calculations --------------------- */

export function getProductCalculations(input: CalcInput): CalcResult {
    const price = toNumberSafe(input.price);
    const originalPrice = toNumberSafe(input.originalPrice ?? input.price);

    // PV/монеты: берём из БД, иначе дефолт floor(price/200)
    const bonusCoins =
        input.customPv != null ? input.customPv : Math.floor(price / PV_PRICE_DIVIDER);

    // Кэшбек (в рублях): customCashback уже ДОЛЯ (0..1), не процент!
    // Например: 0.05 = 5%, 0.10 = 10%
    const cashbackFraction = input.customCashback ?? DEFAULT_CASHBACK_FRACTION;
    const cashback = Math.ceil(price * cashbackFraction);

    return {
        price,
        originalPrice,
        formattedPrice: formatPriceRU(price),
        formattedOriginalPrice: formatPriceRU(originalPrice),
        discountPercentage: calcDiscountPercentage(originalPrice, price),
        savings: calcSavings(originalPrice, price),
        hasDiscount: originalPrice > price,
        bonusCoins,
        cashback,
    };
}

/* -------------------------- hook -------------------------- */

/**
 * Просто обёртка над функцией — никаких fetch/настроек.
 * На вход даём product, в котором уже лежат customPv/customCashback из БД.
 */
export const useProductCalculations = (product: CalcInput): CalcResult => {
    return getProductCalculations(product);
};

/* -------------------- named exports (sugar) ------------------- */

export const calculateDiscountPercentage = calcDiscountPercentage;
export const calculateSavings = calcSavings;
export const formatPrice = formatPriceRU;

/**
 * Удобные утилиты, если нужно отдельно посчитать PV/кэшбек:
 */
export function calculateBonusCoins(price: MoneyLike, customPv?: number | null): number {
    const p = toNumberSafe(price);
    return customPv != null ? customPv : Math.floor(p / PV_PRICE_DIVIDER);
}

export function calculateCashback(price: MoneyLike, customCashback?: number | null): number {
    const p = toNumberSafe(price);
    // customCashback уже ДОЛЯ (0..1), не процент!
    const fraction = customCashback ?? DEFAULT_CASHBACK_FRACTION;
    return Math.ceil(p * fraction);
}
