// src/storage/orderItemStorage.ts
import { and, eq, sql } from 'drizzle-orm';
import { db } from '#db/db';

import { order } from '#db/schema/orders';
import { orderItem, type OrderItem } from '#db/schema/orderItem';
import { product } from '#db/schema/products';
import { promotion, promotionProduct } from '#db/schema/promotions';

import { settlementSettingsRuntime } from '#config/settlementSettings';
import { productStorage } from './productsStorage';

type ProductSnapshot = {
    unitPriceRub: number;
    pvEach: number;
    isPvEligible: boolean;
    sku: string | null;
    productName: string;
    productSlug: string | null;
    primaryImageUrl: null;  // << всегда null
    categoryId: string | null;
};

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/* -----------------------------------------------------------
   Картинки отключены: всегда возвращаем null
------------------------------------------------------------ */
async function getPrimaryImageUrlFromJsonb(): Promise<null> {
    return null;
}

async function getProductSnapshot(productId: string, now = new Date()): Promise<ProductSnapshot | null> {
    const [row] = await db
        .select({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            customPv: product.customPv,
            isPvEligible: product.isPvEligible,
            sku: product.sku,
            categoryId: product.categoryId,
            // images: product.images  ← картинки удалены
        })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);

    if (!row) return null;

    const [promo] = await db
        .select({
            percentOff: promotion.percentOff,
            fixedPriceRub: promotion.fixedPriceRub,
            startsAt: promotion.startsAt,
        })
        .from(promotionProduct)
        .innerJoin(promotion, eq(promotion.id, promotionProduct.promotionId))
        .where(
            and(
                eq(promotionProduct.productId, productId),
                eq(promotion.isActive, true),
                sql`${promotion.startsAt} IS NULL OR ${promotion.startsAt} <= ${now}`,
                sql`${promotion.endsAt}   IS NULL OR ${promotion.endsAt}   >= ${now}`,
            ),
        )
        .orderBy(sql`coalesce(${promotion.startsAt}, now()) DESC`)
        .limit(1);

    let effectivePrice = Number(row.price ?? 0);

    if (promo) {
        if (promo.fixedPriceRub != null) {
            effectivePrice = Number(promo.fixedPriceRub);
        } else if (promo.percentOff != null) {
            effectivePrice = Math.max(0, effectivePrice * (1 - Number(promo.percentOff) / 100));
        }
    }

    const isPvEligible = !!row.isPvEligible;
    const pvEach = isPvEligible
        ? (row.customPv ?? Math.floor(effectivePrice / settlementSettingsRuntime.pvRubPerPv))
        : 0;

    return {
        unitPriceRub: round2(effectivePrice),
        pvEach,
        isPvEligible,
        sku: row.sku ?? null,
        productName: row.name,
        productSlug: row.slug ?? null,
        primaryImageUrl: null,   // << ВСЕГДА null
        categoryId: row.categoryId ?? null,
    };
}

/* -----------------------------------------------------------
   Публичный API
------------------------------------------------------------ */
export const orderItemStorage = {
    async listByOrder(orderId: string): Promise<OrderItem[]> {
        return db
            .select()
            .from(orderItem)
            .where(eq(orderItem.orderId, orderId))
            .orderBy(orderItem.createdAt);
    },

    /**
     * ✅ FIX-0.1: Добавить item в корзину
     * @param orderId - ID заказа (draft)
     * @param productId - ID товара
     * @param qty - Количество
     * @param txOverride - Внешняя транзакция (если есть)
     */
    async addItem(orderId: string, productId: string, qty = 1, txOverride?: any): Promise<OrderItem[]> {
        if (qty <= 0) throw new Error('Quantity must be positive');

        // ✅ FIX-0.1: Используем внешнюю транзакцию если передана
        const executeTx = txOverride ? async (fn: any) => fn(txOverride) : db.transaction.bind(db);

        return executeTx(async (tx: any) => {
            // ✅ FIX-1: Только проверка stock БЕЗ резервирования
            // Stock будет списан атомарно в ordersController.createOrder
            const [prod] = await tx
                .select({ stock: product.stock })
                .from(product)
                .where(eq(product.id, productId))
                .limit(1);

            if (!prod || prod.stock < qty) {
                throw new Error(`Insufficient stock for product ${productId}`);
            }

            const snap = await getProductSnapshot(productId);
            if (!snap) throw new Error('Product not found');

            const lineSubtotal = snap.unitPriceRub * qty;
            const lineTotal = lineSubtotal;
            const pvTotal = snap.pvEach * qty;

            const [existing] = await tx
                .select()
                .from(orderItem)
                .where(and(eq(orderItem.orderId, orderId), eq(orderItem.productId, productId)))
                .limit(1);

            if (existing) {
                await tx
                    .update(orderItem)
                    .set({
                        qty: existing.qty + qty,
                        updatedAt: new Date(),
                    })
                    .where(eq(orderItem.id, existing.id));
            } else {
                await tx.insert(orderItem).values({
                    orderId,
                    productId,
                    productName: snap.productName,
                    productSlug: snap.productSlug,
                    imageUrl: null,                // << картинка отключена
                    categoryId: snap.categoryId,
                    sku: snap.sku,
                    qty,
                    unitPriceRub:     String(snap.unitPriceRub),
                    lineSubtotalRub:  String(lineSubtotal),
                    lineDiscountRub:  '0',
                    lineTotalRub:     String(lineTotal),
                    isPvEligible:     snap.isPvEligible,
                    pvEach:           snap.pvEach,
                    pvTotal,
                });
            }

            // ❌ FIX-1: УБРАЛИ reserveStock - stock не меняется при добавлении в cart
            // await productStorage.reserveStock(productId, qty, tx);

            // ✅ FIX-0.2: Передаём tx в recalcOrderTotals
            await recalcOrderTotals(orderId, tx);

            return tx
                .select()
                .from(orderItem)
                .where(eq(orderItem.orderId, orderId))
                .orderBy(orderItem.createdAt);
        });
    },

    async setQuantity(orderId: string, productId: string, qty: number) {
        if (qty < 0) throw new Error('Quantity must be >= 0');

        return db.transaction(async (tx) => {
            const [item] = await tx
                .select()
                .from(orderItem)
                .where(and(eq(orderItem.orderId, orderId), eq(orderItem.productId, productId)))
                .limit(1);

            if (!item) return;

            const qtyDiff = qty - item.qty;

            if (qty === 0) {
                await tx.delete(orderItem).where(eq(orderItem.id, item.id));
                // ❌ FIX-1: УБРАЛИ releaseStock - stock не меняется в cart operations
                // await productStorage.releaseStock(productId, item.qty, tx);
            } else if (qtyDiff < 0) {
                const unitPrice = Number(item.unitPriceRub);
                const lineSubtotal = unitPrice * qty;
                const pvTotal = item.pvEach * qty;

                await tx
                    .update(orderItem)
                    .set({
                        qty,
                        lineSubtotalRub: String(round2(lineSubtotal)),
                        lineTotalRub:    String(round2(lineSubtotal - Number(item.lineDiscountRub))),
                        pvTotal,
                        updatedAt: new Date(),
                    })
                    .where(eq(orderItem.id, item.id));

                // ❌ FIX-1: УБРАЛИ releaseStock
                // await productStorage.releaseStock(productId, Math.abs(qtyDiff), tx);
            } else if (qtyDiff > 0) {
                // ✅ FIX-1: Только проверка доступности БЕЗ резервирования
                const [prod] = await tx
                    .select({ stock: product.stock })
                    .from(product)
                    .where(eq(product.id, productId))
                    .limit(1);

                if (!prod || prod.stock < qtyDiff) {
                    throw new Error(`Insufficient stock for product ${productId}`);
                }

                const unitPrice = Number(item.unitPriceRub);
                const lineSubtotal = unitPrice * qty;
                const pvTotal = item.pvEach * qty;

                await tx
                    .update(orderItem)
                    .set({
                        qty,
                        lineSubtotalRub: String(round2(lineSubtotal)),
                        lineTotalRub:    String(round2(lineSubtotal - Number(item.lineDiscountRub))),
                        pvTotal,
                        updatedAt: new Date(),
                    })
                    .where(eq(orderItem.id, item.id));

                // ❌ FIX-1: УБРАЛИ reserveStock
                // await productStorage.reserveStock(productId, qtyDiff, tx);
            }

            await recalcOrderTotals(orderId);
        });
    },

    async removeItem(orderId: string, productId: string) {
        return db.transaction(async (tx) => {
            const [item] = await tx
                .select()
                .from(orderItem)
                .where(and(eq(orderItem.orderId, orderId), eq(orderItem.productId, productId)))
                .limit(1);

            if (!item) return;

            await tx
                .delete(orderItem)
                .where(and(eq(orderItem.orderId, orderId), eq(orderItem.productId, productId)));

            // ❌ FIX-1: УБРАЛИ releaseStock - stock не меняется в cart operations
            // await productStorage.releaseStock(productId, item.qty, tx);

            await recalcOrderTotals(orderId);
        });
    },

    async clear(orderId: string) {
        return db.transaction(async (tx) => {
            const items = await tx
                .select()
                .from(orderItem)
                .where(eq(orderItem.orderId, orderId));

            await tx.delete(orderItem).where(eq(orderItem.orderId, orderId));

            // ❌ FIX-1: УБРАЛИ releaseStock - stock не меняется в cart operations
            // for (const item of items) {
            //     await productStorage.releaseStock(item.productId, item.qty, tx);
            // }

            await recalcOrderTotals(orderId);
        });
    },
};

/* -----------------------------------------------------------
   Пересчёт итогов заказа
------------------------------------------------------------ */
/* -----------------------------------------------------------
   Пересчёт итогов заказа
------------------------------------------------------------ */
/**
 * ✅ FIX-0.2: Пересчитать totals для заказа
 * @param orderId - ID заказа
 * @param txOverride - Внешняя транзакция (если есть)
 */
async function recalcOrderTotals(orderId: string, txOverride?: any) {
    // ✅ FIX-0.2: Используем tx если передан, иначе db
    const dbOrTx = txOverride ?? db;

    // ✅ FIX-3: НЕ перезаписываем totals для finalized orders
    const [orderRow] = await dbOrTx
        .select({ status: order.status })
        .from(order)
        .where(eq(order.id, orderId))
        .limit(1);

    if (!orderRow || orderRow.status !== 'pending') {
        // Order уже оформлен (status != 'pending'), не перезаписываем totals
        console.log(`⚠️ Order ${orderId} is finalized (status=${orderRow?.status}), skip recalc`);
        return;
    }

    const result = await dbOrTx.execute(sql/*sql*/`
        SELECT
          COALESCE(SUM(line_subtotal_rub::numeric), 0) AS subtotal,
          COALESCE(SUM(line_discount_rub::numeric), 0) AS discount,
          COALESCE(SUM(line_total_rub::numeric),   0) AS total,
          COALESCE(SUM(pv_total), 0)                AS pv_total
        FROM order_item
        WHERE order_id = ${orderId};
    `);

    // корректный доступ к rows
    const agg = result.rows[0] as {
        subtotal: string;
        discount: string;
        total: string;
        pv_total: string;
    };

    const subtotal = Number(agg?.subtotal ?? 0);
    const discount = Number(agg?.discount ?? 0);
    const total    = Number(agg?.total ?? 0);
    const pvTotal  = Math.floor(Number(agg?.pv_total ?? 0));

    const cashbackRub = total * (settlementSettingsRuntime.vwcCashbackPercent / 100);
    const networkFund = total * (settlementSettingsRuntime.networkFundPercent / 100);

    await dbOrTx
        .update(order)
        .set({
            itemsSubtotalRub: String(round2(subtotal)),
            discountTotalRub: String(round2(discount)),
            orderBaseRub:     String(round2(subtotal - discount)),
            pvEarned:         pvTotal,
            vwcCashback:      String(round2(cashbackRub)),
            networkFundRub:   String(round2(networkFund)),
            totalPayableRub:  String(round2(total)),
            updatedAt:        new Date(),
        })
        .where(eq(order.id, orderId));
}
