// backend/src/services/tinkoff/tinkoffRepositories.ts
import { paymentsStorage } from '#storage/paymentsStorage';
import ordersStorage from '#storage/ordersStorage';
import { settingsStorage } from '#storage/settingsStorage';
import type {
    TinkoffSettings,
    PaymentSettingsRepo,
    PaymentTxRepo,
    OrdersRepo,
} from '../tinkoffPaymentService';

/**
 * Payment Settings Repository Adapter
 */
export class TinkoffSettingsRepository implements PaymentSettingsRepo {
    async getActiveByProvider(provider: 'tinkoff'): Promise<TinkoffSettings | null> {
        // Get Tinkoff credentials from env (or settings storage if implemented)
        const terminalKey = process.env.TINKOFF_TERMINAL_KEY;
        const secretKey = process.env.TINKOFF_SECRET_KEY;
        const isTestMode = process.env.TINKOFF_TEST_MODE === 'true';

        if (!terminalKey || !secretKey) {
            console.error('Tinkoff credentials not configured in environment');
            return null;
        }

        return {
            terminalKey,
            secretKey,
            isTestMode,
        };
    }
}

/**
 * Payment Transaction Repository Adapter
 */
export class TinkoffPaymentTxRepository implements PaymentTxRepo {
    async create(tx: {
        paymentId: string;
        orderId: string;
        amountRub: number;
        currency: 'RUB';
        status: 'pending' | 'paid' | 'failed' | 'expired';
        provider: 'tinkoff';
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        // Map Tinkoff transaction to our payment schema
        await paymentsStorage.createPayment({
            orderId: tx.orderId,
            method: 'card', // Tinkoff uses card payments
            status: this.mapStatus(tx.status),
            amountRub: tx.amountRub.toString(),
            currency: tx.currency,
            externalId: tx.paymentId,
        });
    }

    async updateStatus(
        paymentId: string,
        status: 'pending' | 'paid' | 'failed' | 'expired'
    ): Promise<void> {
        const payment = await paymentsStorage.getByExternalId(paymentId);
        if (!payment) {
            throw new Error(`Payment not found: ${paymentId}`);
        }

        await paymentsStorage.updatePaymentStatus(payment.id, this.mapStatus(status));
    }

    private mapStatus(
        tinkoffStatus: 'pending' | 'paid' | 'failed' | 'expired'
    ): 'init' | 'awaiting' | 'authorized' | 'captured' | 'refunded' | 'failed' {
        switch (tinkoffStatus) {
            case 'pending':
                return 'awaiting';
            case 'paid':
                return 'captured';
            case 'failed':
            case 'expired':
                return 'failed';
            default:
                return 'init';
        }
    }
}

/**
 * Orders Repository Adapter
 */
export class TinkoffOrdersRepository implements OrdersRepo {
    async updateStatus(orderId: string, status: 'paid' | 'failed'): Promise<void> {
        // Map Tinkoff payment status to order status
        // 'paid' -> 'paid', 'failed' -> 'canceled'
        const orderStatus = status === 'paid' ? 'paid' : 'canceled';
        await ordersStorage.updateOrderStatus(orderId, orderStatus);
    }
}
