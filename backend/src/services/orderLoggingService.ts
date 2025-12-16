// backend/src/services/orderLoggingService.ts
import { db } from '#db/db';
import { orderLog } from '#db/schema/system';
import {and, eq} from "drizzle-orm";

/**
 * ✅ Task 4.1: Детальное логирование изменений балансов в order_log
 *
 * Сервис для логирования всех изменений, связанных с заказами:
 * - Смена статусов заказа
 * - Начисление бонусов (PV, VWC, реферальные)
 * - Списания и возвраты
 * - Изменения delivery-статусов
 */

export interface LogOrderEventParams {
    orderId: string;
    event: string;
    meta?: Record<string, any>;
}

export const orderLoggingService = {
    /**
     * Логировать событие заказа
     */
    async logEvent(params: LogOrderEventParams): Promise<void> {
        const { orderId, event, meta } = params;

        await db.insert(orderLog).values({
            orderId,
            event,
            meta: meta ?? null,
            createdAt: new Date(),
        });
    },

    /**
     * Логировать смену статуса заказа
     */
    async logStatusChange(
        orderId: string,
        oldStatus: string,
        newStatus: string,
        reason?: string
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: `status:${oldStatus}→${newStatus}`,
            meta: { oldStatus, newStatus, reason: reason ?? null },
        });
    },

    /**
     * Логировать начисление PV
     */
    async logPvEarned(
        orderId: string,
        pvAmount: number,
        userId: string
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'balance:pv_earned',
            meta: {
                type: 'pv',
                amount: pvAmount,
                userId,
                description: `Начислено ${pvAmount} PV за заказ`,
            },
        });
    },

    /**
     * Логировать начисление VWC кешбэка
     */
    async logVwcCashback(
        orderId: string,
        vwcAmount: number,
        userId: string
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'balance:vwc_cashback',
            meta: {
                type: 'vwc',
                amount: vwcAmount,
                userId,
                description: `Кешбэк VWC: ${vwcAmount} руб.`,
            },
        });
    },

    /**
     * Логировать реферальный бонус
     */
    async logReferralBonus(
        orderId: string,
        referrerId: string,
        level: number,
        amount: number,
        bonusType: 'direct' | 'network'
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: `balance:referral_${bonusType}_level${level}`,
            meta: {
                type: 'referral',
                bonusType,
                level,
                amount,
                referrerId,
                description: `Реферальный бонус ${bonusType} уровня ${level}: ${amount} руб.`,
            },
        });
    },

    /**
     * Логировать бинарный бонус
     */
    async logBinaryBonus(
        orderId: string,
        userId: string,
        amount: number,
        leftLegVolume: number,
        rightLegVolume: number
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'balance:binary_bonus',
            meta: {
                type: 'binary',
                amount,
                userId,
                leftLegVolume,
                rightLegVolume,
                description: `Бинарный бонус: ${amount} руб.`,
            },
        });
    },

    /**
     * Логировать ранговый бонус
     */
    async logRankBonus(
        orderId: string,
        userId: string,
        rank: string,
        amount: number
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'balance:rank_bonus',
            meta: {
                type: 'rank',
                rank,
                amount,
                userId,
                description: `Ранговый бонус (${rank}): ${amount} руб.`,
            },
        });
    },

    /**
     * Логировать возврат средств при отмене заказа
     */
    async logRefund(
        orderId: string,
        userId: string,
        amount: number,
        reason: string
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'balance:refund',
            meta: {
                type: 'refund',
                amount,
                userId,
                reason,
                description: `Возврат ${amount} руб. (${reason})`,
            },
        });
    },

    /**
     * Логировать смену статуса доставки
     */
    async logDeliveryStatusChange(
        orderId: string,
        oldStatus: string,
        newStatus: string,
        trackingCode?: string
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: `delivery:${oldStatus}→${newStatus}`,
            meta: {
                oldStatus,
                newStatus,
                trackingCode: trackingCode ?? null,
            },
        });
    },

    /**
     * Логировать применение промокода
     */
    async logPromoCodeApplied(
        orderId: string,
        promoCode: string,
        discountAmount: number
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'promo:applied',
            meta: {
                promoCode,
                discountAmount,
                description: `Применён промокод ${promoCode}, скидка ${discountAmount} руб.`,
            },
        });
    },

    /**
     * Логировать отмену промокода
     */
    async logPromoCodeCancelled(
        orderId: string,
        promoCode: string,
        discountAmount: number
    ): Promise<void> {
        await this.logEvent({
            orderId,
            event: 'promo:cancelled',
            meta: {
                promoCode,
                discountAmount,
                description: `Отменён промокод ${promoCode}, возврат ${discountAmount} руб.`,
            },
        });
    },

    /**
     * Получить все логи для заказа
     */
    async getOrderLogs(orderId: string): Promise<any[]> {
        const { eq, desc } = await import('drizzle-orm');
        return db
            .select()
            .from(orderLog)
            .where(eq(orderLog.orderId, orderId))
            .orderBy(desc(orderLog.createdAt));
    },

    /**
     * Получить логи изменений балансов (для аудита)
     */
    async getBalanceChangeLogs(orderId: string): Promise<any[]> {
        const { eq, desc, like } = await import('drizzle-orm');
        return db
            .select()
            .from(orderLog)
            .where(
                and(
                    eq(orderLog.orderId, orderId),
                    like(orderLog.event, 'balance:%')
                )
            )
            .orderBy(desc(orderLog.createdAt));
    },
};
