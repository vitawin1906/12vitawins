// backend/src/controllers/ordersController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { inArray, sql, eq, and, gte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import ordersStorage from '#storage/ordersStorage';
import { orderItemStorage } from '#storage/orderItemStorage';
import { orderLifecycleService } from '../services/orderLifecycleService';
import { promoCodeService } from '../services/promoCodeService';
import { deliveryFeeService } from '../services/deliveryFeeService';
import {
    orderStatusEnum,
    deliveryStatusEnum,
    paymentMethodEnum
} from '#db/schema/enums';
import { db } from '#db/db';

/* ───────────────── Enums ───────────────── */

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];

const ZOrderStatus = z.enum(orderStatusEnum.enumValues as [
    OrderStatus,
    ...OrderStatus[]
]);
const ZDeliveryStatus = z.enum(deliveryStatusEnum.enumValues as [
    DeliveryStatus,
    ...DeliveryStatus[]
]);

/* ───────────────── Validation Schemas ───────────────── */

const CreateOrderSchema = z.object({
    comment: z.string().max(500).optional(),
    paymentMethod: z.enum(paymentMethodEnum.enumValues),
    deliveryAddress: z.string().max(1000).optional(),
    deliveryService: z.enum(['sdek', 'russianpost', 'yandex']).optional(),
    promoCode: z.string().max(50).optional(),
    idempotencyKey: z.string().uuid().optional()
});

const UpdateOrderStatusSchema = z.object({
    status: ZOrderStatus
});

const UpdateDeliveryStatusSchema = z.object({
    deliveryStatus: ZDeliveryStatus,
    trackingCode: z.string().optional()
});

const ListOrdersQuery = z.object({
    status: ZOrderStatus.optional(),
    deliveryStatus: ZDeliveryStatus.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
});

/* ───────────────── Orders Controller ───────────────── */

export const ordersController = {
    /* ───────────────── USER: Create Order ───────────────── */
    createOrder: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const body = CreateOrderSchema.parse(req.body);

            // Idempotency
            if (body.idempotencyKey) {
                const { order: orderTable } = await import('../db/schema/orders');
                const [existingOrder] = await db
                    .select()
                    .from(orderTable)
                    .where(
                        sql`${orderTable.idempotencyKey} = ${body.idempotencyKey}
                        AND ${orderTable.userId} = ${userId}`
                    )
                    .limit(1);

                if (existingOrder) {
                    const items = await orderItemStorage.listByOrder(
                        existingOrder.id
                    );
                    return res.status(201).json({
                        success: true,
                        message: 'Order already exists (idempotent)',
                        order: {
                            id: existingOrder.id,
                            status: existingOrder.status,
                            totalPayableRub: existingOrder.totalPayableRub,
                            itemsCount: items.length,
                            createdAt: existingOrder.createdAt
                        }
                    });
                }
            }

            const order = await db.transaction(async tx => {
                const draft = await ordersStorage.findDraftOrder(userId);
                if (!draft)
                    throw new AppError(
                        AppErrorCode.NOT_FOUND,
                        'No draft order (cart) found',
                        404
                    );

                // Items
                const items = await orderItemStorage.listByOrder(draft.id);
                if (items.length === 0)
                    throw new AppError(
                        AppErrorCode.VALIDATION_ERROR,
                        'Cart is empty',
                        400
                    );

                // Stock check
                const { product } = await import('../db/schema/products');
                const productIds = items.map(i => i.productId);

                const products = await tx
                    .select({ id: product.id, stock: product.stock, name: product.name })
                    .from(product)
                    .where(inArray(product.id, productIds))
                    .for('update');

                const productMap = new Map(
                    products.map(p => [p.id, p])
                );

                for (const item of items) {
                    const prod = productMap.get(item.productId);
                    if (!prod)
                        throw new AppError(
                            AppErrorCode.NOT_FOUND,
                            `Товар ${item.productName} не найден`,
                            404
                        );

                    if (prod.stock < item.qty)
                        throw new AppError(
                            AppErrorCode.VALIDATION_ERROR,
                            `Недостаточно товара "${prod.name}". Доступно ${prod.stock}, нужно ${item.qty}`,
                            400
                        );
                }

                /* ───────────────── ATOMIC STOCK UPDATE (C-3 FIX) ───────────────── */
                for (const item of items) {
                    const result = await tx
                        .update(product)
                        .set({
                            stock: sql`stock - ${item.qty}`,
                            updatedAt: new Date()
                        })
                        .where(
                            and(
                                eq(product.id, item.productId),
                                gte(product.stock, item.qty)
                            )
                        )
                        .returning({ id: product.id });

                    if (result.length === 0)
                        throw new AppError(
                            AppErrorCode.VALIDATION_ERROR,
                            `Недостаточно товара (productId=${item.productId})`,
                            400
                        );
                }

                /* ───────────────── Promo, Delivery, Totals ───────────────── */
                const subtotal = items.reduce(
                    (sum, i) => sum + Number(i.lineTotalRub ?? 0),
                    0
                );

                let promoDiscount = 0;
                let promoCodeId: string | null = null;
                // ✅ FIX-2: Referral discount (10% от subtotal, max 1000 RUB)
                let referralDiscount = 0;
                let referralUserId: string | null = null;

                if (body.promoCode) {
                    // Пробуем сначала как promo code
                    const promoResult = await promoCodeService.validateAndCalculate({
                        code: body.promoCode,
                        userId,
                        orderSubtotalRub: subtotal
                    }).catch(() => null);

                    if (promoResult) {
                        promoDiscount = promoResult.discountRub;
                        promoCodeId = promoResult.promoCodeId;
                    } else {
                        // Если не promo code, пробуем как referral code (Telegram ID)
                        const referralCodeNum = parseInt(body.promoCode, 10);
                        if (!isNaN(referralCodeNum)) {
                            const { appUser } = await import('#db/schema/users');
                            const [referrer] = await tx
                                .select({ id: appUser.id })
                                .from(appUser)
                                .where(eq(appUser.telegramId, String(referralCodeNum)))
                                .limit(1);

                            if (referrer) {
                                referralUserId = referrer.id;
                                // ✅ 10% скидка с капом 1000 ₽ (по Registry.md)
                                const discount10Percent = subtotal * 0.1;
                                referralDiscount = Math.min(discount10Percent, 1000);
                            }
                        }
                    }
                }

                // ✅ FIX-7: ФИЛЬТРАЦИЯ eligible товаров для PV
                // Registry.md: PV начисляется ТОЛЬКО за eligible товары (isPvEligible = true)
                const eligibleSubtotal = items
                    .filter(i => i.isPvEligible)
                    .reduce((sum, i) => sum + Number(i.lineTotalRub ?? 0), 0);

                // ✅ FIX-2: ПРАВИЛЬНЫЙ order_base с учётом ВСЕХ скидок
                // Согласно Registry.md: order_base = eligible товары после всех скидок, КРОМЕ доставки
                const orderBase = eligibleSubtotal - promoDiscount - referralDiscount;

                // ✅ РАССЧИТАТЬ PV согласно Registry.md: PV = floor(order_base / 200)
                const pvEarned = Math.floor(orderBase / 200);

                // ✅ РАССЧИТАТЬ VWC кэшбек согласно Registry.md: VWC = round(order_base * 0.05, 2)
                const vwcCashback = Math.round(orderBase * 0.05 * 100) / 100;

                // ✅ РАССЧИТАТЬ Network Fund согласно Registry.md: NetworkFund = round(order_base * 0.50, 2)
                const networkFundRub = Math.round(orderBase * 0.50 * 100) / 100;

                // Расчет доставки (используем ПОЛНЫЙ subtotal для проверки бесплатной доставки, НЕ orderBase)
                const deliveryFeeResult =
                    await deliveryFeeService.calculateFee({
                        deliveryService: body.deliveryService ?? null,
                        deliveryAddress: body.deliveryAddress ?? null,
                        cartSubtotalRub: subtotal // ← Используем subtotal (ВСЕ товары, не только eligible)
                    });

                const deliveryFee = deliveryFeeResult.feeRub;

                // ✅ Итоговая сумма = subtotal - скидки + delivery
                const totalPayable = subtotal - promoDiscount - referralDiscount + deliveryFee;

                const finalOrder = await ordersStorage.update(draft.id, {
                    status: 'new' satisfies OrderStatus,
                    comment: body.comment,
                    paymentMethod: body.paymentMethod,
                    deliveryAddress: body.deliveryAddress,
                    deliveryService: body.deliveryService,
                    deliveryFeeRub: String(deliveryFee),
                    deliveryRequired: !!body.deliveryAddress,

                    // ✅ ПРАВИЛЬНЫЕ расчеты согласно Registry.md
                    itemsSubtotalRub: String(subtotal),
                    discountTotalRub: String(0), // Line item discounts (если есть)
                    promoDiscountRub: String(promoDiscount), // Promo code discount
                    // ✅ FIX-2: Referral discount
                    referralDiscountRub: String(referralDiscount),
                    referralUserId, // ✅ FIX-2: Сохраняем referrer для статистики
                    orderBaseRub: String(orderBase), // ← order_base (с учётом ВСЕХ скидок)
                    pvEarned, // ← PV
                    vwcCashback: String(vwcCashback), // ← VWC кэшбек
                    networkFundRub: String(networkFundRub), // ← Network Fund
                    totalPayableRub: String(totalPayable),

                    idempotencyKey: body.idempotencyKey ?? null,
                    updatedAt: new Date()
                });

                if (promoCodeId) {
                    await promoCodeService.applyPromoCode({
                        promoCodeId,
                        userId,
                        orderId: draft.id,
                        discountRub: promoDiscount
                    });
                }

                return {
                    finalOrder,
                    items,
                    promoDiscount,
                    deliveryFee
                };
            });

            return res.status(201).json({
                success: true,
                message: 'Order created successfully',
                order: {
                    id: order.finalOrder!.id,
                    status: order.finalOrder!.status,
                    totalPayableRub: order.finalOrder!.totalPayableRub,
                    itemsCount: order.items.length,
                    createdAt: order.finalOrder!.createdAt
                }
            });
        })
    ],

    /* ───────────────── USER: List Orders ───────────────── */
    getMyOrders: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const q = ListOrdersQuery.parse(req.query);

            const params = {
                userId,
                limit: q.limit,
                offset: q.offset,
                sort: 'created_desc' as const,
                ...(q.status ? { status: q.status } : {}),
                ...(q.deliveryStatus ? { deliveryStatus: q.deliveryStatus } : {})
            };

            const orders = await ordersStorage.list(params);

            return res.json({
                success: true,
                orders: orders.map(o => ({
                    id: o.id,
                    status: o.status,
                    deliveryStatus: o.deliveryStatus,
                    paymentStatus: (o as any).paymentStatus,
                    totalPayableRub: o.totalPayableRub,
                    pvEarned: o.pvEarned,
                    deliveryTrackingCode: (o as any).deliveryTrackingCode,
                    createdAt: o.createdAt,
                    updatedAt: o.updatedAt
                })),
                pagination: {
                    limit: q.limit,
                    offset: q.offset
                }
            });
        })
    ],

    /* ───────────────── USER: Get Order By ID ───────────────── */
    getOrderById: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { id: orderId } = z
                .object({ id: z.string().uuid() })
                .parse(req.params);

            const ord = await ordersStorage.getById(orderId);
            if (!ord)
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Order not found',
                    404
                );

            if (ord.userId !== userId && !req.user!.isAdmin)
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'You do not have access to this order',
                    403
                );

            const items = await orderItemStorage.listByOrder(orderId);

            return res.json({
                success: true,
                order: {
                    id: ord.id,
                    status: ord.status,
                    deliveryStatus: ord.deliveryStatus,
                    paymentStatus: (ord as any).paymentStatus,
                    itemsSubtotalRub: ord.itemsSubtotalRub,
                    discountTotalRub: (ord as any).discountTotalRub,
                    deliveryFeeRub: (ord as any).deliveryFeeRub,
                    totalPayableRub: ord.totalPayableRub,
                    pvEarned: ord.pvEarned,
                    vwcCashback: (ord as any).vwcCashback,
                    deliveryAddress: (ord as any).deliveryAddress,
                    deliveryTrackingCode:
                    (ord as any).deliveryTrackingCode,
                    comment: (ord as any).comment,
                    createdAt: ord.createdAt,
                    updatedAt: ord.updatedAt,

                    items: items.map(i => ({
                        id: i.id,
                        productId: i.productId,
                        productName: i.productName,
                        productSlug: i.productSlug,
                        qty: i.qty,
                        unitPriceRub: i.unitPriceRub,
                        lineTotalRub: i.lineTotalRub,
                        pvPerUnit: (i as any).pvPerUnit
                    }))
                }
            });
        })
    ],

    /* ───────────────── USER: Cancel Order ───────────────── */
    cancelOrder: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { id: orderId } = z
                .object({ id: z.string().uuid() })
                .parse(req.params);

            const ord = await ordersStorage.getById(orderId);
            if (!ord)
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Order not found',
                    404
                );

            if (ord.userId !== userId)
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'You do not have access to this order',
                    403
                );

            if (ord.status !== 'new' && ord.status !== 'pending')
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Cannot cancel order in current status',
                    400
                );

            await promoCodeService.cancelPromoCodeUsage(orderId);

            const canceled = await ordersStorage.cancel(orderId);

            return res.json({
                success: true,
                message: 'Order canceled successfully',
                order: {
                    id: canceled!.id,
                    status: canceled!.status
                }
            });
        })
    ],

    /* ───────────────── ADMIN: List Orders ───────────────── */
    listAllOrders: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const q = ListOrdersQuery.parse(req.query);

            const params = {
                limit: q.limit,
                offset: q.offset,
                sort: 'created_desc' as const,
                ...(q.status ? { status: q.status } : {}),
                ...(q.deliveryStatus ? { deliveryStatus: q.deliveryStatus } : {})
            };

            const orders = await ordersStorage.list(params);

            return res.json({
                success: true,
                orders: orders.map(o => ({
                    id: o.id,
                    userId: o.userId,
                    status: o.status,
                    deliveryStatus: o.deliveryStatus,
                    paymentStatus: (o as any).paymentStatus,
                    totalPayableRub: o.totalPayableRub,
                    pvEarned: o.pvEarned,
                    deliveryTrackingCode:
                    (o as any).deliveryTrackingCode,
                    createdAt: o.createdAt,
                    updatedAt: o.updatedAt
                })),
                pagination: { limit: q.limit, offset: q.offset }
            });
        })
    ],

    /* ───────────────── ADMIN: Order By ID ───────────────── */
    getOrderByIdAdmin: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: orderId } = z
                .object({ id: z.string().uuid() })
                .parse(req.params);

            const ord = await ordersStorage.getById(orderId);
            if (!ord)
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Order not found',
                    404
                );

            const items = await orderItemStorage.listByOrder(orderId);

            return res.json({
                success: true,
                order: {
                    ...ord,
                    items: items.map(i => ({
                        id: i.id,
                        productId: i.productId,
                        productName: i.productName,
                        productSlug: i.productSlug,
                        qty: i.qty,
                        unitPriceRub: i.unitPriceRub,
                        lineTotalRub: i.lineTotalRub,
                        pvPerUnit: (i as any).pvPerUnit
                    }))
                }
            });
        })
    ],

    /* ───────────────── ADMIN: Update Order Status ───────────────── */
    updateOrderStatus: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: orderId } = z
                .object({ id: z.string().uuid() })
                .parse(req.params);

            const { status } = UpdateOrderStatusSchema.parse(req.body);

            const updated = await ordersStorage.update(orderId, {
                status
            });

            return res.json({
                success: true,
                message: `Order status updated to ${status}`,
                order: { id: updated!.id, status: updated!.status }
            });
        })
    ],

    /* ───────────────── ADMIN: Update Delivery Status ───────────────── */
    updateDeliveryStatus: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: orderId } = z
                .object({ id: z.string().uuid() })
                .parse(req.params);

            const { deliveryStatus, trackingCode } =
                UpdateDeliveryStatusSchema.parse(req.body);

            const updated = await ordersStorage.update(orderId, {
                deliveryStatus,
                ...(trackingCode
                    ? { deliveryTrackingCode: trackingCode }
                    : {})
            });

            return res.json({
                success: true,
                message: `Delivery status updated to ${deliveryStatus}`,
                order: {
                    id: updated!.id,
                    deliveryStatus: updated!.deliveryStatus,
                    deliveryTrackingCode:
                    (updated as any).deliveryTrackingCode
                }
            });
        })
    ],

    /* ───────────────── ADMIN: Mark Delivered ───────────────── */
    markAsDelivered: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: orderId } = z
                .object({ id: z.string().uuid() })
                .parse(req.params);

            const updated = await ordersStorage.markDelivered(orderId);
            await orderLifecycleService.onDelivered(orderId);

            return res.json({
                success: true,
                message:
                    'Order marked as delivered. MLM bonuses processed.',
                order: {
                    id: updated!.id,
                    status: updated!.status,
                    deliveryStatus: updated!.deliveryStatus
                }
            });
        })
    ],

    /* ───────────────── USER + ADMIN: Delivery History ───────────────── */
    getDeliveryHistory: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { deliveryEvent } = await import(
                '../db/schema/notifications'
                );
            const { db } = await import('../db/db');
            const { eq, desc } = await import('drizzle-orm');

            const orderId = z.string().uuid().parse(req.params.id);
            const userId = (req as any).userId;

            const order = await ordersStorage.getById(orderId);
            if (!order)
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Order not found',
                    404
                );

            const isAdmin = req.headers['x-user-role'] === 'admin';

            if (!isAdmin && order.userId !== userId)
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'Access denied',
                    403
                );

            const events = await db
                .select()
                .from(deliveryEvent)
                .where(eq(deliveryEvent.orderId, orderId))
                .orderBy(desc(deliveryEvent.createdAt));

            return res.json({
                success: true,
                orderId,
                deliveryHistory: events.map(e => ({
                    id: e.id,
                    provider: e.provider,
                    status: e.status,
                    providerStatus: e.providerStatus,
                    payload: e.payload,
                    createdAt: e.createdAt
                }))
            });
        })
    ],

    /* ───────────────── ADMIN: Delivery Events ───────────────── */
    getOrderDeliveryEvents: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { deliveryEvent } = await import(
                '../db/schema/notifications'
                );
            const { db } = await import('../db/db');
            const { eq, desc } = await import('drizzle-orm');

            const orderId = z.string().uuid().parse(req.params.id);

            const order = await ordersStorage.getById(orderId);
            if (!order)
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Order not found',
                    404
                );

            const events = await db
                .select()
                .from(deliveryEvent)
                .where(eq(deliveryEvent.orderId, orderId))
                .orderBy(desc(deliveryEvent.createdAt));

            return res.json({
                success: true,
                orderId,
                order: {
                    status: order.status,
                    deliveryStatus: order.deliveryStatus,
                    deliveryService: order.deliveryService,
                    deliveryTrackingCode: order.deliveryTrackingCode
                },
                events: events.map(e => ({
                    id: e.id,
                    provider: e.provider,
                    status: e.status,
                    providerStatus: e.providerStatus,
                    payload: e.payload,
                    createdAt: e.createdAt
                }))
            });
        })
    ],

    /* ───────────────── ADMIN: Add Delivery Event ───────────────── */
    addDeliveryEvent: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { deliveryEvent } = await import(
                '../db/schema/notifications'
                );
            const { db } = await import('../db/db');

            const orderId = z.string().uuid().parse(req.params.id);

            const AddDeliveryEventSchema = z.object({
                provider: z.enum(['sdek', 'russianpost', 'yandex']).optional(),
                status: z.enum([
                    'pending',
                    'in_transit',
                    'delivered',
                    'returned',
                    'not_required',
                    'lost'
                ]),
                providerStatus: z.string().optional(),
                payload: z.record(z.string(), z.unknown()).optional()
            });

            const body = AddDeliveryEventSchema.parse(req.body);

            const order = await ordersStorage.getById(orderId);
            if (!order)
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Order not found',
                    404
                );

            const providerForDb = body.provider ?? null;

            const [event] = await db
                .insert(deliveryEvent)
                .values({
                    orderId,
                    provider: providerForDb,
                    status: body.status,
                    providerStatus: body.providerStatus ?? null,
                    payload: body.payload ?? null
                })
                .returning();

            if (body.status === 'delivered') {
                await ordersStorage.update(orderId, {
                    deliveryStatus: 'delivered'
                });
            } else if (body.status === 'in_transit') {
                await ordersStorage.update(orderId, {
                    deliveryStatus: 'in_transit'
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Delivery event added',
                event
            });
        })
    ],

    /* ───────────────── ADMIN: Delivery Issues ───────────────── */
    getDeliveryIssues: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { order } = await import('../db/schema/orders');
            const { db } = await import('../db/db');
            const { inArray, and, ne, desc } = await import('drizzle-orm');

            const limit = req.query.limit
                ? Number(req.query.limit)
                : 50;
            const offset = req.query.offset
                ? Number(req.query.offset)
                : 0;

            const ordersWithIssues = await db
                .select()
                .from(order)
                .where(
                    and(
                        inArray(
                            order.deliveryStatus as any,
                            ['returned', 'lost'] as const
                        ),
                        ne(order.status as any, 'canceled')
                    )
                )
                .orderBy(desc(order.updatedAt))
                .limit(limit)
                .offset(offset);

            return res.json({
                success: true,
                orders: ordersWithIssues.map(o => ({
                    id: o.id,
                    userId: o.userId,
                    status: o.status,
                    deliveryStatus: o.deliveryStatus,
                    deliveryService: o.deliveryService,
                    deliveryTrackingCode: o.deliveryTrackingCode,
                    totalPayableRub: o.totalPayableRub,
                    createdAt: o.createdAt,
                    updatedAt: o.updatedAt
                })),
                pagination: { limit, offset }
            });
        })
    ]
};
