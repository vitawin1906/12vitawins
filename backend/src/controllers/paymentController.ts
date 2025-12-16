// backend/src/controllers/paymentController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { paymentsStorage } from '#storage/paymentsStorage';
import ordersStorage from '../storage/ordersStorage';
import { paymentProcessor } from '../services/paymentProcessor';
import { tinkoffService } from '../services/tinkoff/tinkoffService';
import { paymentMethodEnum, paymentStatusEnum } from '#db/schema/enums';

/* ───────────────── Enums (из БД) ───────────────── */
type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

const ZPaymentMethod = z.enum(paymentMethodEnum.enumValues as [PaymentMethod, ...PaymentMethod[]]);
const ZPaymentStatus = z.enum(paymentStatusEnum.enumValues as [PaymentStatus, ...PaymentStatus[]]);

/* ───────────────── Validation Schemas ───────────────── */

const CreatePaymentSchema = z.object({
    orderId: z.string().uuid(),
    amountRub: z.number().positive(),
    method: ZPaymentMethod, // 'card' | 'sbp' | 'wallet' | 'cash' | 'promo'
});

const TinkoffWebhookSchema = z.object({
    TerminalKey: z.string(),
    OrderId: z.string(),
    Success: z.boolean(),
    Status: z.string(),
    PaymentId: z.string().optional(),
    ErrorCode: z.string().optional(),
    Amount: z.number().optional(), // обычно в копейках
    Token: z.string().optional(),
});

const ListPaymentsQuery = z.object({
    status: ZPaymentStatus.optional(), // 'init' | 'awaiting' | 'authorized' | 'captured' | 'refunded' | 'failed'
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

/* ───────────────── Helpers ───────────────── */

const toPgMoney = (v: number) => v.toFixed(2);

/** Маппинг статусов Tinkoff → наши PaymentStatus */
function mapTinkoffStatus(s: string): PaymentStatus {
    switch (s) {
        case 'AUTHORIZED': return 'authorized';
        case 'CONFIRMED':
        case 'CONFIRMED_PARTIAL': return 'captured';
        case 'REFUNDED':
        case 'PARTIAL_REFUNDED': return 'refunded';
        case 'REJECTED':
        case 'CANCELED': return 'failed';
        default: return 'awaiting';
    }
}

/* ───────────────── Payment Controller ───────────────── */

export const paymentController = {
    /* ───────────────── User Payments ───────────────── */

    /** POST /api/payments/create — создать платёж для заказа */
    createPayment: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const body = CreatePaymentSchema.parse(req.body);

            // Проверяем заказ и владение им
            const ord = await ordersStorage.getById(body.orderId);
            if (!ord) throw new AppError(AppErrorCode.NOT_FOUND, 'Order not found', 404);
            if (ord.userId !== userId) {
                throw new AppError(AppErrorCode.FORBIDDEN, 'You do not have access to this order', 403);
            }

            // Уже оплачен? Считаем сумму 'captured'
            const capturedTotal = await paymentsStorage.sumCapturedForOrder(body.orderId);
            if (Number(capturedTotal) > 0) {
                throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Order is already paid', 400);
            }

            // Update order status to pending (awaiting payment)
            await ordersStorage.updateOrderStatus(body.orderId, 'pending');

            // For card payments, use Tinkoff
            if (body.method === 'card') {
                const result = await tinkoffService.createPayment({
                    orderId: body.orderId,
                    amountRub: body.amountRub,
                    description: `Оплата заказа ${body.orderId}`,
                    customerKey: req.user!.id, // Use telegram ID as customer key
                });

                if (!result.success) {
                    throw new AppError(
                        AppErrorCode.VALIDATION_ERROR,
                        result.error || 'Failed to create payment',
                        400
                    );
                }

                // Get the created payment from DB
                const payment = await paymentsStorage.getByExternalId(result.paymentId);
                if (!payment) {
                    throw new AppError(AppErrorCode.NOT_FOUND, 'Payment not found after creation', 500);
                }

                return res.status(201).json({
                    success: true,
                    message: 'Payment created successfully',
                    payment: {
                        id: payment.id,
                        orderId: payment.orderId,
                        amountRub: payment.amountRub,
                        status: payment.status,
                        method: payment.method,
                        paymentUrl: result.paymentUrl,
                        createdAt: payment.createdAt,
                    },
                });
            }

            // For other payment methods (wallet, cash, etc.) - use old flow
            const payment = await paymentsStorage.create({
                orderId: body.orderId,
                method: body.method,
                amountRub: toPgMoney(body.amountRub),
                currency: 'RUB',
                status: 'awaiting',
            });

            return res.status(201).json({
                success: true,
                message: 'Payment created successfully',
                payment: {
                    id: payment.id,
                    orderId: payment.orderId,
                    amountRub: payment.amountRub,
                    status: payment.status,
                    method: payment.method,
                    createdAt: payment.createdAt,
                },
            });
        }),
    ],

    /** GET /api/payments/:id/status — статус платежа */
    getPaymentStatus: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { id: paymentId } = z.object({ id: z.string().uuid() }).parse(req.params);

            const payment = await paymentsStorage.getById(paymentId);
            if (!payment) throw new AppError(AppErrorCode.NOT_FOUND, 'Payment not found', 404);

            // Проверяем доступ через заказ
            const ord = await ordersStorage.getById(payment.orderId);
            if (ord?.userId !== userId && !req.user!.isAdmin) {
                throw new AppError(AppErrorCode.FORBIDDEN, 'You do not have access to this payment', 403);
            }

            return res.json({
                success: true,
                payment: {
                    id: payment.id,
                    orderId: payment.orderId,
                    amountRub: payment.amountRub,
                    status: payment.status,
                    method: payment.method,
                    createdAt: payment.createdAt,
                    authorizedAt: payment.authorizedAt,
                    capturedAt: payment.capturedAt,
                    refundedAt: payment.refundedAt,
                    errorCode: payment.errorCode,
                    errorMessage: payment.errorMessage,
                },
            });
        }),
    ],

    /** GET /api/payments/my — мои платежи */
    getMyPayments: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const q = ListPaymentsQuery.parse(req.query);

            // Берём заказы пользователя и по ним — платежи
            const orders = await ordersStorage.list({
                userId,
                limit: 1000,
                offset: 0,
                sort: 'created_desc',
            });

            const paymentsChunks = await Promise.all(
                orders.map((o) => paymentsStorage.listByOrder(o.id))
            );
            let all = paymentsChunks.flat();

            if (q.status) all = all.filter((p) => p.status === q.status);

            all.sort((a, b) => (b.createdAt?.valueOf() ?? 0) - (a.createdAt?.valueOf() ?? 0));
            const slice = all.slice(q.offset, q.offset + q.limit);

            return res.json({
                success: true,
                payments: slice.map((p) => ({
                    id: p.id,
                    orderId: p.orderId,
                    amountRub: p.amountRub,
                    status: p.status,
                    method: p.method,
                    createdAt: p.createdAt,
                    capturedAt: p.capturedAt,
                })),
                pagination: { limit: q.limit, offset: q.offset, total: all.length },
            });
        }),
    ],

    /** POST /api/payments/tinkoff/notification — webhook Tinkoff (public) */
    tinkoffNotification: [
        asyncHandler(async (req: Request, res: Response) => {
            const body = TinkoffWebhookSchema.parse(req.body);

            // Use Tinkoff service to handle notification (includes Token verification)
            const result = await tinkoffService.handleNotification(body);

            if (!result.success) {
                console.warn('[Tinkoff Webhook] Error:', result.error);
                return res.status(401).json({ success: false, error: result.error });
            }

            return res.json({ success: true, message: 'OK' });
        }),
    ],

    /** GET /api/payments/tinkoff/success — Success redirect from Tinkoff */
    tinkoffSuccess: [
        asyncHandler(async (req: Request, res: Response) => {
            const { orderId } = z.object({ orderId: z.string().optional() }).parse(req.query);

            // Redirect to frontend success page
            const redirectUrl = orderId
                ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?orderId=${orderId}`
                : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success`;

            return res.redirect(redirectUrl);
        }),
    ],

    /** GET /api/payments/tinkoff/fail — Fail redirect from Tinkoff */
    tinkoffFail: [
        asyncHandler(async (req: Request, res: Response) => {
            const { orderId } = z.object({ orderId: z.string().optional() }).parse(req.query);

            // Redirect to frontend fail page
            const redirectUrl = orderId
                ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/fail?orderId=${orderId}`
                : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/fail`;

            return res.redirect(redirectUrl);
        }),
    ],

    /* ───────────────── Admin Payments ───────────────── */

    /** GET /api/admin/payments — все платежи (админ) */
    listAllPayments: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const q = ListPaymentsQuery.parse(req.query);

            const params = {
                ...(q.status !== undefined ? { status: q.status } : {}),
                limit: q.limit,
                offset: q.offset,
                sort: 'created_desc' as const,
            };

            const list = await paymentsStorage.list(params);

            return res.json({
                success: true,
                payments: list.map((p) => ({
                    id: p.id,
                    orderId: p.orderId,
                    externalId: p.externalId,
                    amountRub: p.amountRub,
                    status: p.status,
                    method: p.method,
                    createdAt: p.createdAt,
                    capturedAt: p.capturedAt,
                    errorCode: p.errorCode,
                    errorMessage: p.errorMessage,
                })),
                pagination: { limit: q.limit, offset: q.offset },
            });
        }),
    ],

    /** POST /api/admin/payments/:id/retry — повторить обработку платежа (админ) */
    retryPayment: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: paymentId } = z.object({ id: z.string().uuid() }).parse(req.params);

            const p = await paymentsStorage.getById(paymentId);
            if (!p) throw new AppError(AppErrorCode.NOT_FOUND, 'Payment not found', 404);

            await paymentProcessor.retryFailedOrder(p.orderId);

            return res.json({ success: true, message: 'Payment retry initiated' });
        }),
    ],

    /** GET /api/admin/payments/stats — простая статистика (админ) */
    getPaymentStats: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const statuses: PaymentStatus[] = ['init', 'awaiting', 'authorized', 'captured', 'refunded', 'failed'];
            const lists = await Promise.all(
                statuses.map((s) => paymentsStorage.list({ status: s, limit: 10000, offset: 0 }))
            );

            const flatAll = lists.flat();
            const totalCount = flatAll.length;
            const successful = lists[statuses.indexOf('captured')] ?? [];
            const failed = lists[statuses.indexOf('failed')] ?? [];

            const sum = (xs: typeof flatAll) => xs.reduce((acc, p) => acc + Number(p.amountRub ?? 0), 0);
            const successfulAmountRub = sum(successful).toFixed(2);
            const totalAmountRub = sum(flatAll).toFixed(2);

            return res.json({
                success: true,
                stats: {
                    totalCount,
                    successfulCount: successful.length,
                    failedCount: failed.length,
                    totalAmountRub,
                    successfulAmountRub,
                },
            });
        }),
    ],
};
