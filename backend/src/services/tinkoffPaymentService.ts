// src/services/tinkoffPaymentService.ts
import crypto from 'crypto';
import { z } from 'zod';

/* =========================
   Репозитории (контракты)
   ========================= */

export interface TinkoffSettings {
    terminalKey: string;
    secretKey: string;
    isTestMode?: boolean;
}

export interface PaymentSettingsRepo {
    getActiveByProvider(provider: 'tinkoff'): Promise<TinkoffSettings | null>;
}

export interface PaymentTxRepo {
    create(tx: {
        paymentId: string;
        orderId: string;
        amountRub: number;
        currency: 'RUB';
        status: 'pending' | 'paid' | 'failed' | 'expired';
        provider: 'tinkoff';
        metadata?: Record<string, unknown>;
    }): Promise<void>;

    updateStatus(
        paymentId: string,
        status: 'pending' | 'paid' | 'failed' | 'expired'
    ): Promise<void>;
}

export interface OrdersRepo {
    // ❗ в Vitawin order.id = UUID (string)
    updateStatus(orderId: string, status: 'paid' | 'failed'): Promise<void>;
}

/* =========================
   Zod-схемы ответов Тинькофф
   ========================= */

export const TinkoffInitResponseSchema = z.object({
    Success: z.boolean(),
    ErrorCode: z.string().optional(),
    Message: z.string().optional(),
    Details: z.string().optional(),
    TerminalKey: z.string().optional(),
    Status: z.string().optional(),
    PaymentId: z.string().optional(),
    OrderId: z.string().optional(),
    Amount: z.number().optional(),
    PaymentURL: z.string().url().optional(),
}).passthrough();

export type TinkoffInitResponse = z.infer<typeof TinkoffInitResponseSchema>;

export const TinkoffGetStateResponseSchema = z.object({
    Success: z.boolean(),
    Status: z.string().optional(),
    Message: z.string().optional(),
}).passthrough();

export type TinkoffGetStateResponse = z.infer<typeof TinkoffGetStateResponseSchema>;

/* =========================
   Утилита парсинга JSON
   ========================= */
async function parseJson<T>(resp: Response, schema: z.ZodSchema<T>): Promise<T> {
    const data = await resp.json();
    return schema.parse(data);
}

/* =========================
   Сервис Тинькофф
   ========================= */

export class TinkoffPaymentService {
    constructor(
        private payments: PaymentTxRepo,
        private orders: OrdersRepo,
        private settingsRepo: PaymentSettingsRepo,
        private baseUrlCfg?: { test?: string; prod?: string },
        private routerCfg?: { notify?: string; success?: string; fail?: string }
    ) {}

    private async getActiveSettings(): Promise<TinkoffSettings> {
        const s = await this.settingsRepo.getActiveByProvider('tinkoff');
        if (!s) throw new Error('Тинькофф не настроен или отключен');
        return s;
    }

    private baseUrl(isTest: boolean) {
        return isTest
            ? this.baseUrlCfg?.test ?? 'https://rest-api-test.tinkoff.ru/v2/'
            : this.baseUrlCfg?.prod ?? 'https://securepay.tinkoff.ru/v2/';
    }

    // Формирование Token (см. доку Тинькофф)
    private generateToken(params: Record<string, any>, secretKey: string): string {
        const p: Record<string, any> = { ...params };
        delete p.Token;
        delete p.DATA;
        delete p.Receipt;
        p.Password = secretKey;

        const sorted = Object.keys(p).sort();
        const concat = sorted.map((k) => String(p[k] ?? '')).join('');
        return crypto.createHash('sha256').update(concat).digest('hex');
    }

    /* ----- API: Init (создание платежа) ----- */
    async createPayment(data: {
        orderId: string;          // UUID из orders.id
        amountRub: number;
        description: string;
        customerKey?: string;
    }): Promise<{ success: true; paymentUrl: string; paymentId: string } | { success: false; error: string }> {
        const settings = await this.getActiveSettings();
        const apiUrl = this.baseUrl(!!settings.isTestMode);

        const amountInKopecks = Math.round(data.amountRub * 100);

        const params = {
            TerminalKey: settings.terminalKey,
            Amount: amountInKopecks,
            OrderId: data.orderId,
            Description: data.description,
            NotificationURL: this.routerCfg?.notify ?? 'https://example.com/api/payment/tinkoff/webhook',
            SuccessURL: this.routerCfg?.success ?? 'https://example.com/checkout/success',
            FailURL: this.routerCfg?.fail ?? 'https://example.com/checkout/fail',
            ...(data.customerKey ? { CustomerKey: data.customerKey } : {}),
        };

        const Token = this.generateToken(params, settings.secretKey);

        const resp = await fetch(`${apiUrl}Init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...params, Token }),
        });

        const result = await parseJson(resp, TinkoffInitResponseSchema);

        if (result.Success && result.PaymentURL && result.PaymentId) {
            await this.payments.create({
                paymentId: result.PaymentId,
                orderId: data.orderId,
                amountRub: data.amountRub,
                currency: 'RUB',
                status: 'pending',
                provider: 'tinkoff',
                metadata: {
                    terminalKey: settings.terminalKey,
                    isTestMode: !!settings.isTestMode,
                    description: data.description,
                    customerKey: data.customerKey,
                },
            });

            return { success: true, paymentUrl: result.PaymentURL, paymentId: result.PaymentId };
        }

        return {
            success: false,
            error: result.Message || result.Details || 'Ошибка при создании платежа',
        };
    }

    /* ----- Webhook: уведомление от Тинькофф ----- */
    async handleNotification(notification: Record<string, any>): Promise<{ success: boolean; error?: string }> {
        const settings = await this.getActiveSettings();

        if (notification.TerminalKey !== settings.terminalKey) {
            return { success: false, error: 'Invalid TerminalKey' };
        }

        const expected = this.generateToken(notification, settings.secretKey);
        if (notification.Token !== expected) {
            return { success: false, error: 'Invalid signature' };
        }

        // isPaid — наш единый флаг успешного платежа
        const isPaid =
            notification.Success === true ||
            notification.Success === 'true' ||
            notification.Status === 'CONFIRMED';

        const paymentId = String(notification.PaymentId ?? '');
        const orderId = String(notification.OrderId ?? '');

        // 1) фиксируем статус транзакции
        await this.payments.updateStatus(paymentId, isPaid ? 'paid' : 'failed');

        // 2) фиксируем статус заказа
        if (orderId) {
            await this.orders.updateStatus(orderId, isPaid ? 'paid' : 'failed');

            // ✅ FIX-3: Registry.md — при оплате НЕ начисляем PV/VWC/бонусы
            // Только: Partner upgrade + Network Fund allocation
            if (isPaid) {
                try {
                    const { orderLifecycleService } = await import('./orderLifecycleService');
                    await orderLifecycleService.onPaid(orderId);
                    console.log(`✅ Order ${orderId} marked as paid, lifecycle handlers executed`);
                } catch (err) {
                    console.error(`❌ Failed to execute onPaid lifecycle for order ${orderId}:`, err);
                    // Не бросаем ошибку, чтобы не блокировать webhook
                }
            }
        }

        return { success: true };
    }

    /* ----- API: GetState (статус платежа) ----- */
    async getPaymentStatus(
        paymentId: string
    ): Promise<{ success: true; status: string } | { success: false; error: string }> {
        const settings = await this.getActiveSettings();
        const apiUrl = this.baseUrl(!!settings.isTestMode);

        const params = { TerminalKey: settings.terminalKey, PaymentId: paymentId };
        const Token = this.generateToken(params, settings.secretKey);

        const resp = await fetch(`${apiUrl}GetState`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...params, Token }),
        });

        const result = await parseJson(resp, TinkoffGetStateResponseSchema);

        if (result.Success) {
            return { success: true, status: result.Status ?? 'UNKNOWN' };
        }
        return { success: false, error: result.Message || 'Ошибка получения статуса' };
    }
}
