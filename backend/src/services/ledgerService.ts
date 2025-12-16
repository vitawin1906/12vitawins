// src/services/ledgerService.ts
import ordersStorage from '#storage/ordersStorage';
import { usersStorage } from '#storage/usersStorage';
import { settlementSettingsRuntime } from '#config/settlementSettings';
import { roundHalfUp } from '#utils/money';
import { errorMonitoringService } from './errorMonitoringService';
import { telegramNotificationService } from './telegramNotificationService';
import walletService from './walletService';
import { ledgerStorage } from '#storage/ledgerStorage';

type DeliveryStatus = 'pending' | 'shipped' | 'delivered' | string;

/**
 * ✅ FIX-1 & FIX-2: Registry.md — начисления ТОЛЬКО при deliveryStatus='delivered'
 * НЕ при status='paid'
 */
function isDelivered(o: any): boolean {
    return o?.deliveryStatus === 'delivered';
}

async function notifyCashback(userId: string, amount: number) {
    const svc: any = telegramNotificationService as any;
    if (typeof svc.sendCashbackNotification === 'function') {
        await svc.sendCashbackNotification(userId, amount);
        return;
    }
    if (typeof svc.send === 'function') {
        await svc.send(userId, `💸 Кэшбэк за заказ: ${amount.toFixed(2)} VWC`);
    }
}

async function notifyReferralBonus(userId: string, amount: number, level: number, buyerLabel = 'приглашённый покупатель') {
    const svc: any = telegramNotificationService as any;
    if (typeof svc.sendBonusNotification === 'function') {
        await svc.sendBonusNotification(userId, amount, buyerLabel, level);
    } else if (typeof svc.send === 'function') {
        await svc.send(userId, `💰 Реферальный бонус L${level}: ${amount.toFixed(2)} ₽`);
    }
}

export class LedgerService {
    /**
     * РЕВЕРС ТРАНЗАКЦИИ
     * Обертка над ledgerStorage.reverseTransaction()
     */
    async reverseTransaction(txnId: string, reason = 'Reversal'): Promise<void> {
        console.log(`🔄 Reversing transaction ${txnId}...`);

        try {
            // 1 — создаем reversal txn + postings
            const { txn: reversalTxn } = await ledgerStorage.reverseTransaction(txnId, reason);

            // 2 — zero-sum check (глобальный аудит)
            const ok = await ledgerStorage.validateTransactionZeroSum(reversalTxn.id);
            if (!ok) {
                throw new Error(`Zero-sum validation failed for reversal txn ${reversalTxn.id}`);
            }

            console.log(`✅ Transaction ${txnId} reversed successfully → reversalTxn=${reversalTxn.id}`);
        } catch (err) {
            console.error(`❌ Failed to reverse transaction ${txnId}`, err);
            errorMonitoringService.logError('error', 'Ledger reversal failed', err as Error);
            throw err;
        }
    }

    /**
     * ✅ FIX-1: Обработка ДОСТАВЛЕННОГО заказа (deliveryStatus='delivered'):
     *  - кэшбэк VWC (только partner/partner_pro)
     *  - реферальные бонусы (L1-L15)
     *
     * Registry.md: начисления ТОЛЬКО при delivered
     */
    async processOrderPayment(orderId: string): Promise<void> {
        try {
            console.log(`🔄 Processing bonuses for order ${orderId}...`);

            const order = await ordersStorage.getById(orderId);
            if (!order) throw new Error(`Order ${orderId} not found`);

            if (!isDelivered(order)) {
                console.log(`⚠️ Order ${orderId} not delivered yet, skip bonuses`);
                return;
            }

            const buyer = await usersStorage.getUserById(order.userId);
            if (!buyer) {
                console.log(`⚠️ Buyer ${order.userId} not found`);
                return;
            }

            const baseRub = Number(order.orderBaseRub ?? order.totalPayableRub ?? 0);
            if (!(Number.isFinite(baseRub) && baseRub > 0)) {
                console.log(`⚠️ Order ${orderId} has non-positive base, skip`);
                return;
            }

            const vwcPercent = Number(settlementSettingsRuntime?.vwcCashbackPercent ?? 5);

            // 1) КЭШБЭК (идемпотентно)
            await this.createCashbackTxn(buyer.id, orderId, baseRub, vwcPercent);

            // 2) РЕФЕРАЛКА (3 уровня)
            const refStart =
                buyer.referrerId ??
                (buyer as any).referrer_id ??
                null;

            if (refStart) {
                await this.createReferralBonuses(orderId, buyer.id, String(refStart), baseRub);
            }

            console.log(`✅ Ledger processing completed for order ${orderId}`);
        } catch (err) {
            console.error(`❌ Error in processOrderPayment(${orderId})`, err);
            errorMonitoringService.logError('error', 'Ledger processing failed', err as Error);
        }
    }

    /**
     * Кэшбэк VWC покупателю.
     * Дт: system:vwc  /  Кт: user:vwc
     */
    private async createCashbackTxn(
        userId: string,
        orderId: string,
        baseRub: number,
        percent: number
    ): Promise<void> {
        const amountVwc = roundHalfUp(baseRub * (percent / 100), 2);
        if (!(amountVwc > 0)) return;

        // ✅ FIX-5: Registry.md — customer НЕ получает VWC кэшбек (НИКОГДА)
        // canReceiveFirstlineBonus разрешает ТОЛЬКО L1 бонус, НЕ VWC
        const user = await usersStorage.getUserById(userId);
        if (!user) {
            console.log(`⚠️ User ${userId} not found, skip cashback`);
            return;
        }

        // VWC кэшбек ТОЛЬКО для partner и partner_pro
        if (user.mlmStatus === 'customer') {
            console.log(`⚠️ Skipping VWC cashback for customer ${userId} (Registry: customers don't receive VWC)`);
            return;
        }

        await walletService.creditUser(userId, amountVwc, {
            currency: 'VWC',
            userType: 'vwc',
            systemType: 'vwc',
            opType: 'reward',
            options: {
                operationId: `order:${orderId}:cashback:vwc`,
                memo: `VWC cashback ${percent}%`,
                orderId,
                meta: { kind: 'cashback' },
            },
        });

        await notifyCashback(userId, amountVwc);
        console.log(`💸 Cashback ${amountVwc} VWC credited to user ${userId} (${user.mlmStatus})`);
    }

    /**
     * ✅ FIX-4: Реферальные бонусы L1-L15 (Registry.md, без компрессии)
     * Использует mlmStorage.getUpline() для получения всей цепочки upline
     * Дт: system:network_fund  /  Кт: user:referral
     */
    private async createReferralBonuses(
        orderId: string,
        buyerId: string,
        referrerStartIdOrTelegram: string,
        baseRub: number
    ): Promise<void> {
        // ✅ Registry.md: бонусы на 15 уровней (без компрессии)
        const levelPercents = [
            Number(settlementSettingsRuntime?.referralLevel1Percent ?? 20), // L1: 20%
            Number(settlementSettingsRuntime?.referralLevel2Percent ?? 5),  // L2: 5%
            Number(settlementSettingsRuntime?.referralLevel3Percent ?? 1),  // L3: 1%
            1, 1, 1, 1, 1, // L4-L8: 1%
            0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, // L9-L15: 0.5%
        ];

        // ✅ Получить upline через mlmStorage (использует network_edge)
        const mlmStorage = await import('#storage/mlmStorage');
        const upline = await mlmStorage.default.getUpline(buyerId, 15);

        console.log(`📊 Processing referral bonuses for order ${orderId}: ${upline.length} upline levels found`);

        for (const hop of upline) {
            const level = hop.level;
            if (level > 15) break;

            const referrer = await usersStorage.getUserById(hop.parentId);
            if (!referrer) {
                console.log(`⚠️ Referrer ${hop.parentId} not found at L${level}, skip`);
                continue;
            }

            const mlmStatus = referrer.mlmStatus ?? 'customer';

            // ✅ Registry: customer не получает бонусов (кроме L1 с флагом)
            if (mlmStatus === 'customer') {
                if (level === 1 && referrer.canReceiveFirstlineBonus) {
                    // Customer с флагом получает ТОЛЬКО L1
                    console.log(`✅ Customer ${referrer.id} allowed L1 bonus (canReceiveFirstlineBonus=true)`);
                } else {
                    console.log(`⚠️ Skipping L${level} bonus for customer ${referrer.id} (no bonuses for customers)`);
                    continue;
                }
            }

            // ✅ Partner и partner_pro получают все уровни
            if (mlmStatus !== 'partner' && mlmStatus !== 'partner_pro' && mlmStatus !== 'customer') {
                console.log(`⚠️ Skipping L${level} bonus for ${referrer.id} - unknown status: ${mlmStatus}`);
                continue;
            }

            // ✅ FIX-FAST-START: Проверка Fast Start для L1 (перекрывает обычный L1)
            // Registry.md: Fast Start = 25% L1 в течение 8 недель ВМЕСТО обычного 20%
            if (level === 1 && (mlmStatus === 'partner' || mlmStatus === 'partner_pro')) {
                const { fastStartBonusService } = await import('./fastStartBonusService');
                const shouldOverride = await fastStartBonusService.shouldOverrideL1Bonus(referrer.id);

                if (shouldOverride) {
                    console.log(`⚠️ Skipping L1 bonus for ${referrer.id} - Fast Start will override (25% instead of 20%)`);
                    continue; // НЕ начислять L1, Fast Start начислится в orderLifecycleService.processSpecialBonuses()
                }
            }

            const rate = levelPercents[level - 1] ?? 0;
            if (rate <= 0) continue;

            const bonusRub = roundHalfUp(baseRub * (rate / 100), 2);
            if (bonusRub > 0) {
                try {
                    await walletService.creditUser(referrer.id, bonusRub, {
                        currency: 'RUB',
                        userType: 'referral',
                        systemType: 'network_fund',
                        opType: 'reward',
                        options: {
                            operationId: `order:${orderId}:ref:${level}:${referrer.id}`,
                            memo: `L${level} referral bonus`,
                            orderId,
                            meta: { buyerId, level },
                        },
                    });

                    await notifyReferralBonus(referrer.id, bonusRub, level);
                    console.log(`💰 L${level} bonus ${bonusRub} RUB → ${referrer.id} (${mlmStatus})`);
                } catch (err: any) {
                    // Идемпотентность: если уже начислено, skip
                    if (err?.code === '23505' || err?.message?.includes('duplicate')) {
                        console.log(`⚠️ L${level} bonus already granted to ${referrer.id}`);
                    } else {
                        console.error(`❌ Failed to grant L${level} bonus to ${referrer.id}:`, err);
                    }
                }
            }
        }

        console.log(`✅ Referral bonuses completed for order ${orderId}`);
    }
}

export const ledgerService = new LedgerService();
export default ledgerService;
