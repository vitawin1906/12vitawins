// src/services/paymentProcessor.ts
import { ledgerService } from './ledgerService';

/**
 * Координатор пост-оплатной логики.
 * Делегирует идемпотентные начисления в ledgerService.
 */
export const paymentProcessor = {
    /**
     * Вызывается после успешной оплаты/вебхука платёжки.
     * Бросает ошибку, если orderId пуст.
     */
    async processPaymentConfirmation(orderId: string): Promise<void> {
        if (!orderId) throw new Error('orderId is required');
        try {
            await ledgerService.processOrderPayment(orderId);
        } catch (e) {
            console.error(`[paymentProcessor] processPaymentConfirmation failed for ${orderId}:`, e);
            throw e;
        }
    },

    /**
     * Ретрай: повторяем начисления.
     * ledgerService обязан быть идемпотентным на уровне леджера.
     */
    async retryFailedOrder(orderId: string): Promise<void> {
        if (!orderId) throw new Error('orderId is required');
        try {
            await ledgerService.processOrderPayment(orderId);
        } catch (e) {
            console.error(`[paymentProcessor] retryFailedOrder failed for ${orderId}:`, e);
            throw e;
        }
    },
};

export default paymentProcessor;
