import { db } from '#db/db';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
    promotion as promoTable,
    promotionProduct as promoProductTable,
    type Promotion,
} from '#db/schema/promotions';
import { promotionsStorage } from '#storage/promosStorage';

/* ───────── helpers ───────── */

function must<T>(v: T | null | undefined, msg = 'Not found'): asserts v is NonNullable<T> {
    if (v == null) throw new Error(msg);
}

const toNum = (x: number | string | null | undefined) =>
    x == null ? 0 : typeof x === 'number' ? x : Number(x);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** app money → NUMERIC string(2) */
const toMoney = (x: number | string | null | undefined) => {
    const n = toNum(x);
    return n.toFixed(2);
};

function isActiveAt(p: Promotion, at: Date) {
    if (!p.isActive) return false;
    if (p.startsAt && p.startsAt > at) return false;
    if (p.endsAt && p.endsAt < at) return false;
    return true;
}

/* ───────── public types ───────── */

export type CartItem = {
    productId: string;
    qty: number;
    unitPriceRub: number | string;
};

export type AppliedPromotion = {
    promotionId: string; // всегда строка
    name: string;
    kind: string;
    productId: string;
    qtyAffected: number;
    discountRub: string;
    reason: string;
};

export type PricedCartItem = CartItem & {
    subtotalRub: string;
    discountRub: string;
    totalRub: string;
    applied: AppliedPromotion[];
};

export type CartPricingResult = {
    items: PricedCartItem[];
    totals: {
        subtotalRub: string;
        discountRub: string;
        totalRub: string;
    };
    usedPromotionIds: number[];
};

/* ───────── core discount calculators ───────── */

function calcPercentOff(unit: number, qty: number, percentOff: number) {
    const pct = Math.max(0, Math.min(100, percentOff));
    const discount = round2(unit * qty * (pct / 100));
    return { discount, qtyAffected: qty, reason: `-${pct}%` };
}

function calcFixedPrice(unit: number, qty: number, fixed: number) {
    const perUnitDiscount = Math.max(0, unit - fixed);
    const discount = round2(perUnitDiscount * qty);
    return { discount, qtyAffected: qty, reason: `fixed ${fixed.toFixed(2)} RUB` };
}

function calcBuyXGetY(unit: number, qty: number, buyQty: number, getQty: number) {
    const bx = Math.max(0, Math.floor(buyQty));
    const gy = Math.max(0, Math.floor(getQty));
    if (bx <= 0 || gy <= 0) return { discount: 0, qtyAffected: 0, reason: '' };
    const pack = bx + gy;
    const packs = Math.floor(qty / pack);
    const freeQty = packs * gy;
    const discount = round2(freeQty * unit);
    return { discount, qtyAffected: freeQty, reason: `buy ${bx} get ${gy}` };
}

/* ───────── data access helpers ───────── */

async function getActivePromotionsForProducts(productIds: string[], at: Date): Promise<Promotion[]> {
    if (productIds.length === 0) return [];

    const rows = await db
        .select({
            id: promoTable.id,
            name: promoTable.name,
            kind: promoTable.kind,
            isActive: promoTable.isActive,
            startsAt: promoTable.startsAt,
            endsAt: promoTable.endsAt,
            buyQty: promoTable.buyQty,
            getQty: promoTable.getQty,
            percentOff: promoTable.percentOff,
            fixedPriceRub: promoTable.fixedPriceRub,
        })
        .from(promoTable)
        .innerJoin(promoProductTable, eq(promoProductTable.promotionId, promoTable.id))
        .where(
            and(
                inArray(promoProductTable.productId, productIds),
                eq(promoTable.isActive, true),
                sql`(${promoTable.startsAt} IS NULL OR ${promoTable.startsAt} <= ${at})`,
                sql`(${promoTable.endsAt} IS NULL OR ${promoTable.endsAt} >= ${at})`,
            ),
        )
        .orderBy(desc(promoTable.startsAt), asc(promoTable.id));

    const map = new Map<number, Promotion>();
    for (const r of rows as Promotion[]) map.set(r.id, r);
    return [...map.values()];
}

/* ───────── service ───────── */

export const promoService = {
    createPromotion: promotionsStorage.createPromotion.bind(promotionsStorage),
    updatePromotion: promotionsStorage.updatePromotion.bind(promotionsStorage),
    deletePromotion: promotionsStorage.deletePromotion.bind(promotionsStorage),
    getPromotionById: promotionsStorage.getPromotionById.bind(promotionsStorage),
    listPromotions: promotionsStorage.listPromotions.bind(promotionsStorage),
    activatePromotion: promotionsStorage.activatePromotion.bind(promotionsStorage),

    addProductToPromotion: promotionsStorage.addProductToPromotion.bind(promotionsStorage),
    removeProductFromPromotion: promotionsStorage.removeProductFromPromotion.bind(promotionsStorage),
    listPromotionProducts: promotionsStorage.listPromotionProducts.bind(promotionsStorage),
    getPromotionProduct: promotionsStorage.getPromotionProduct.bind(promotionsStorage),

    countActivePromotions: promotionsStorage.countActivePromotions.bind(promotionsStorage),
    listActivePromotionsAt: promotionsStorage.listActivePromotionsAt.bind(promotionsStorage),

    async getActiveForProducts(productIds: string[], at = new Date()): Promise<Promotion[]> {
        return getActivePromotionsForProducts(productIds, at);
    },

    /* ───────── Главная логика корзины ───────── */

    async priceCart(items: CartItem[], at = new Date()): Promise<CartPricingResult> {
        if (items.length === 0) {
            return {
                items: [],
                totals: { subtotalRub: '0.00', discountRub: '0.00', totalRub: '0.00' },
                usedPromotionIds: [],
            };
        }

        const productIds = items.map(i => i.productId);
        const activePromos = await this.getActiveForProducts(productIds, at);

        const promosByProduct = new Map<string, Promotion[]>();

        if (activePromos.length) {
            const links = await db
                .select({ promotionId: promoProductTable.promotionId, productId: promoProductTable.productId })
                .from(promoProductTable)
                .where(inArray(promoProductTable.productId, productIds));

            const byPromoId = new Map<number, Promotion>(activePromos.map(p => [p.id, p]));

            for (const l of links) {
                const p = byPromoId.get(l.promotionId);
                if (!p) continue;
                if (!promosByProduct.has(l.productId)) promosByProduct.set(l.productId, []);
                promosByProduct.get(l.productId)!.push(p);
            }
        }

        const priced: PricedCartItem[] = [];
        const usedIds = new Set<number>();

        for (const it of items) {
            const qty = Math.max(0, Math.floor(it.qty));
            const unit = toNum(it.unitPriceRub);
            const subtotal = round2(unit * qty);

            let bestDiscount = 0;
            let bestApplied: AppliedPromotion | null = null;

            const promos = promosByProduct.get(it.productId) ?? [];

            for (const promo of promos) {
                if (!isActiveAt(promo, at)) continue;

                const percentOff = toNum(promo.percentOff);
                const fixed = toNum(promo.fixedPriceRub);
                const buyQty = promo.buyQty ?? 0;
                const getQty = promo.getQty ?? 0;

                const candidates = [];

                if (percentOff > 0) candidates.push({ ...calcPercentOff(unit, qty, percentOff), kind: 'percent_off' });
                if (fixed > 0)      candidates.push({ ...calcFixedPrice(unit, qty, fixed),      kind: 'fixed_price' });
                if (buyQty > 0 && getQty > 0)
                    candidates.push({ ...calcBuyXGetY(unit, qty, buyQty, getQty), kind: 'buy_x_get_y' });

                for (const c of candidates) {
                    if (c.discount > bestDiscount) {
                        bestDiscount = c.discount;
                        bestApplied = {
                            promotionId: String(promo.id), // ✔ FIX
                            name: promo.name,
                            kind: c.kind || promo.kind,
                            productId: it.productId,
                            qtyAffected: c.qtyAffected,
                            discountRub: toMoney(c.discount),
                            reason: c.reason,
                        };
                    }
                }
            }

            bestDiscount = Math.min(bestDiscount, subtotal);
            const total = round2(subtotal - bestDiscount);

            if (bestApplied) {
                usedIds.add(Number(bestApplied.promotionId)); // ✔ FIX number
            }

            priced.push({
                ...it,
                subtotalRub: toMoney(subtotal),
                discountRub: toMoney(bestDiscount),
                totalRub: toMoney(total),
                applied: bestApplied ? [bestApplied] : [],
            });
        }

        const subtotalAll = round2(priced.reduce((acc, x) => acc + toNum(x.subtotalRub), 0));
        const discountAll = round2(priced.reduce((acc, x) => acc + toNum(x.discountRub), 0));
        const totalAll = round2(subtotalAll - discountAll);

        return {
            items: priced,
            totals: {
                subtotalRub: toMoney(subtotalAll),
                discountRub: toMoney(discountAll),
                totalRub: toMoney(totalAll),
            },
            usedPromotionIds: [...usedIds],
        };
    },

    /* ───────── Быстрый расчёт одной позиции ───────── */

    priceSingle(item: CartItem, promos: Promotion[], at = new Date()): PricedCartItem {
        const qty = Math.max(0, Math.floor(item.qty));
        const unit = toNum(item.unitPriceRub);
        const subtotal = round2(unit * qty);

        let bestDiscount = 0;
        let bestApplied: AppliedPromotion | null = null;

        for (const promo of promos ?? []) {
            if (!isActiveAt(promo, at)) continue;

            const percentOff = toNum(promo.percentOff);
            const fixed = toNum(promo.fixedPriceRub);
            const buyQty = promo.buyQty ?? 0;
            const getQty = promo.getQty ?? 0;

            const candidates = [];

            if (percentOff > 0) candidates.push({ ...calcPercentOff(unit, qty, percentOff), kind: 'percent_off' });
            if (fixed > 0)      candidates.push({ ...calcFixedPrice(unit, qty, fixed),      kind: 'fixed_price' });
            if (buyQty > 0 && getQty > 0)
                candidates.push({ ...calcBuyXGetY(unit, qty, buyQty, getQty), kind: 'buy_x_get_y' });

            for (const c of candidates) {
                if (c.discount > bestDiscount) {
                    bestDiscount = c.discount;
                    bestApplied = {
                        promotionId: String(promo.id), // ✔ FIX
                        name: promo.name,
                        kind: c.kind || promo.kind,
                        productId: item.productId,
                        qtyAffected: c.qtyAffected,
                        discountRub: toMoney(c.discount),
                        reason: c.reason,
                    };
                }
            }
        }

        bestDiscount = Math.min(bestDiscount, subtotal);
        const total = round2(subtotal - bestDiscount);

        return {
            ...item,
            subtotalRub: toMoney(subtotal),
            discountRub: toMoney(bestDiscount),
            totalRub: toMoney(total),
            applied: bestApplied ? [bestApplied] : [],
        };
    },
};

export default promoService;
