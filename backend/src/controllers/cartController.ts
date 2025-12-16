// backend/src/controllers/cartController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { orderItemStorage } from '#storage/orderItemStorage';
import ordersStorage from '#storage/ordersStorage';
import { productStorage } from '#storage/productsStorage';
import { product } from '#db/schema/products';
import { orderItem } from '#db/schema/orderItem';
import { db } from '#db/db';
import { eq } from 'drizzle-orm';

/* ───────────────── Validation Schemas ───────────────── */

const CartActionSchema = z.object({
    action: z.enum(['add', 'update', 'remove']),
    product_id: z.string().uuid(),
    quantity: z.number().int().min(0).optional(),
});

// ✅ FIX-5: Schema для batch sync
const SyncCartSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().min(1),
        })
    ),
});

/* ───────────────── Helpers ───────────────── */

const fmt = (n: number) => n.toFixed(2);

/* ───────────────── Cart Controller ───────────────── */

export const cartController = {
    /**
     * GET /api/cart
     * Получить текущую корзину пользователя
     */
    getCart: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const order = await ordersStorage.findOrCreateDraftOrder(userId);
            const items = await orderItemStorage.listByOrder(order.id);

            const subtotal = items.reduce((s, i) => s + Number(i.lineTotalRub ?? 0), 0);

            return res.json({
                success: true,
                cart: {
                    items: items.map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        name: i.productName,
                        slug: i.productSlug,
                        price: i.unitPriceRub,
                        qty: i.qty,
                        subtotal: i.lineTotalRub,
                    })),
                    summary: {
                        count: items.length,
                        quantity: items.reduce((s, i) => s + i.qty, 0),
                        subtotal: fmt(subtotal),
                        total: fmt(subtotal),
                    },
                },
            });
        }),
    ],

    /**
     * GET /api/cart/preview
     * Получить предпросмотр корзины с расчетами PV, кэшбека, скидок
     */
    getCartPreview: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const order = await ordersStorage.findOrCreateDraftOrder(userId);
            const items = await orderItemStorage.listByOrder(order.id);

            if (items.length === 0) {
                return res.json({
                    success: true,
                    preview: {
                        items: [],
                        totals: {
                            subtotal: '0.00',
                            discount: '0.00',
                            deliveryFee: '0.00',
                            total: '0.00',
                            pvEarned: 0,
                            cashback: '0.00',
                        },
                    },
                });
            }

            // Расчеты
            const subtotal = items.reduce((s, i) => s + Number(i.lineTotalRub ?? 0), 0);
            const totalPv = items.reduce((s, i) => s + (i.pvTotal ?? 0), 0);

            // Оптимизированный расчёт кэшбека с JOIN (1 запрос вместо N)
            const itemsWithCashback = await db
                .select({
                    productId: orderItem.productId,
                    unitPrice: orderItem.unitPriceRub,
                    qty: orderItem.qty,
                    customCashback: product.customCashback,
                })
                .from(orderItem)
                .leftJoin(product, eq(orderItem.productId, product.id))
                .where(eq(orderItem.orderId, order.id));

            const totalCashback = itemsWithCashback.reduce((sum, item) => {
                const cashbackPercent = Number(item.customCashback ?? 5);
                const itemCashback = Number(item.unitPrice) * item.qty * (cashbackPercent / 100);
                return sum + Math.round(itemCashback);
            }, 0);

            const discount = Number(order.discountTotalRub ?? 0);
            const promoDiscount = Number(order.promoDiscountRub ?? 0);
            const deliveryFee = Number(order.deliveryFeeRub ?? 0);
            const total = subtotal - discount - promoDiscount + deliveryFee;

            return res.json({
                success: true,
                preview: {
                    items: items.map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        name: i.productName,
                        slug: i.productSlug,
                        imageUrl: i.imageUrl,
                        categoryId: i.categoryId,
                        qty: i.qty,
                        unitPrice: i.unitPriceRub,
                        lineTotal: i.lineTotalRub,
                        pvTotal: i.pvTotal ?? 0,
                    })),
                    totals: {
                        subtotal: fmt(subtotal),
                        discount: fmt(discount + promoDiscount),
                        deliveryFee: fmt(deliveryFee),
                        total: fmt(total),
                        pvEarned: totalPv,
                        cashback: fmt(totalCashback),
                    },
                },
            });
        }),
    ],

    /**
     * POST /api/cart/checkout-preview
     * Получить preview для checkout с учётом referral code
     * Body: { referralCode?: string }
     */
    getCheckoutPreview: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { referralCode } = req.body;

            const order = await ordersStorage.findOrCreateDraftOrder(userId);
            const items = await orderItemStorage.listByOrder(order.id);

            if (items.length === 0) {
                return res.json({
                    success: true,
                    preview: {
                        items: [],
                        totals: {
                            subtotal: '0.00',
                            discount: '0.00',
                            referralDiscount: '0.00',
                            deliveryFee: '0.00',
                            total: '0.00',
                            pvPreview: 0,
                            vwcPreview: '0.00',
                            freeShipping: false,
                        },
                    },
                });
            }

            // Расчеты
            const subtotal = items.reduce((s, i) => s + Number(i.lineTotalRub ?? 0), 0);

            // Проверка referral code и расчёт 10% скидки
            let referralDiscount = 0;
            let referralUserId: string | null = null;
            if (referralCode) {
                try {
                    const referralCodeNum = parseInt(referralCode, 10);
                    if (!isNaN(referralCodeNum)) {
                        // Ищем пользователя с таким telegramId
                        const { appUser } = await import('#db/schema/users');
                        const { db } = await import('#db/db');
                        const { eq } = await import('drizzle-orm');

                        const [referrer] = await db
                            .select({ id: appUser.id })
                            .from(appUser)
                            .where(eq(appUser.telegramId, String(referralCodeNum)))
                            .limit(1);

                        if (referrer) {
                            referralUserId = referrer.id;
                            // 10% скидка с капом 1000 ₽
                            const discount10Percent = subtotal * 0.1;
                            referralDiscount = Math.min(discount10Percent, 1000);
                        }
                    }
                } catch (e) {
                    // Invalid referral code - игнорируем
                }
            }

            const orderBase = subtotal - referralDiscount;

            // PV: floor(orderBase / 200)
            const pvPreview = Math.floor(orderBase / 200);

            // VWC кэшбэк: 5% от orderBase
            const vwcPreview = Math.round(orderBase * 0.05 * 100) / 100;

            // Бесплатная доставка от 5000 ₽
            const FREE_SHIPPING_THRESHOLD = 5000;
            const freeShipping = orderBase >= FREE_SHIPPING_THRESHOLD;
            const deliveryFee = freeShipping ? 0 : 300; // Примерная стоимость доставки

            const total = orderBase + deliveryFee;

            return res.json({
                success: true,
                preview: {
                    items: items.map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        name: i.productName,
                        slug: i.productSlug,
                        imageUrl: i.imageUrl,
                        qty: i.qty,
                        unitPrice: i.unitPriceRub,
                        lineTotal: i.lineTotalRub,
                    })),
                    totals: {
                        subtotal: fmt(subtotal),
                        referralDiscount: fmt(referralDiscount),
                        orderBase: fmt(orderBase),
                        deliveryFee: fmt(deliveryFee),
                        total: fmt(total),
                        pvPreview,
                        vwcPreview: fmt(vwcPreview),
                        freeShipping,
                    },
                    referralUserId, // Может использоваться при создании заказа
                },
            });
        }),
    ],

    /**
     * POST /api/cart
     * Обновить корзину (add / update / remove)
     */
    updateCart: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { action, product_id, quantity } = CartActionSchema.parse(req.body);

            const order = await ordersStorage.findOrCreateDraftOrder(userId);

            // Проверить что товар существует
            const product = await productStorage.getById(product_id);
            if (!product) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Product not found', 404);
            }

            // Выполнить действие
            switch (action) {
                case 'add':
                    await orderItemStorage.addItem(order.id, product_id, quantity ?? 1);
                    break;
                case 'update':
                    await orderItemStorage.setQuantity(order.id, product_id, quantity ?? 1);
                    break;
                case 'remove':
                    await orderItemStorage.removeItem(order.id, product_id);
                    break;
            }

            // Получить обновленную корзину
            const items = await orderItemStorage.listByOrder(order.id);
            const subtotal = items.reduce((s, i) => s + Number(i.lineTotalRub ?? 0), 0);

            return res.json({
                success: true,
                message: `Cart ${action} successful`,
                cart: {
                    items: items.map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        name: i.productName,
                        price: i.unitPriceRub,
                        qty: i.qty,
                        subtotal: i.lineTotalRub,
                    })),
                    summary: {
                        count: items.length,
                        quantity: items.reduce((s, i) => s + i.qty, 0),
                        subtotal: fmt(subtotal),
                        total: fmt(subtotal),
                    },
                },
            });
        }),
    ],

    /**
     * POST /api/cart/sync
     * ✅ FIX-0.1, FIX-0.3, FIX-0.5: Batch sync локальной корзины (одной транзакцией)
     */
    syncCart: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { items } = SyncCartSchema.parse(req.body);

            if (items.length === 0) {
                return res.json({
                    success: true,
                    message: 'No items to sync',
                    cart: { items: [], summary: { count: 0, quantity: 0, subtotal: '0.00', total: '0.00' } },
                    results: { synced: [], skipped: [], failed: [] },
                });
            }

            const order = await ordersStorage.findOrCreateDraftOrder(userId);

            // ✅ FIX-0.5: Детальные результаты синхронизации
            const results = {
                synced: [] as string[],
                skipped: [] as { productId: string; reason: string }[],
                failed: [] as { productId: string; error: string }[],
            };

            // ✅ FIX-0.1: Batch sync в ОДНОЙ транзакции (все операции через tx)
            await db.transaction(async (tx) => {
                for (const item of items) {
                    try {
                        // ✅ FIX-0.3: Проверяем stock ПЕРЕД добавлением
                        const [productData] = await tx
                            .select({
                                id: product.id,
                                stock: product.stock,
                                name: product.name,
                            })
                            .from(product)
                            .where(eq(product.id, item.productId))
                            .for('update') // ← SELECT FOR UPDATE для атомарности
                            .limit(1);

                        if (!productData) {
                            results.skipped.push({
                                productId: item.productId,
                                reason: 'Product not found',
                            });
                            continue;
                        }

                        // ✅ FIX-0.3: Проверка stock
                        if (productData.stock < item.quantity) {
                            results.skipped.push({
                                productId: item.productId,
                                reason: `Insufficient stock (available: ${productData.stock}, requested: ${item.quantity})`,
                            });
                            continue;
                        }

                        // ✅ FIX-0.1: Передаём tx в addItem
                        await orderItemStorage.addItem(order.id, item.productId, item.quantity, tx);
                        results.synced.push(item.productId);
                    } catch (error: any) {
                        // ✅ FIX-0.5: Ловим ошибки для каждого item
                        results.failed.push({
                            productId: item.productId,
                            error: error.message || 'Unknown error',
                        });
                        console.error(`❌ Failed to sync product ${item.productId}:`, error);
                    }
                }
            });

            // Получаем обновлённую корзину
            const cartItems = await orderItemStorage.listByOrder(order.id);
            const subtotal = cartItems.reduce((s, i) => s + Number(i.lineTotalRub ?? 0), 0);

            // ✅ FIX-0.5: Возвращаем детальные результаты
            return res.json({
                success: true,
                message: `Synced ${results.synced.length}/${items.length} items`,
                results, // ← Полная информация о результатах
                cart: {
                    items: cartItems.map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        name: i.productName,
                        price: i.unitPriceRub,
                        qty: i.qty,
                        subtotal: i.lineTotalRub,
                    })),
                    summary: {
                        count: cartItems.length,
                        quantity: cartItems.reduce((s, i) => s + i.qty, 0),
                        subtotal: fmt(subtotal),
                        total: fmt(subtotal),
                    },
                },
            });
        }),
    ],

    /**
     * DELETE /api/cart
     * Очистить корзину
     */
    clearCart: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const order = await ordersStorage.findDraftOrder(userId);
            if (!order) {
                return res.json({ success: true, message: 'No active cart' });
            }

            await orderItemStorage.clear(order.id);

            return res.json({ success: true, message: 'Cart cleared' });
        }),
    ],
};
