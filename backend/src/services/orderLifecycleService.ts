// src/services/orderLifecycleService.ts
import { ledgerService } from './ledgerService';
import { tryUpgradeToPartner } from './partnerUpgradeService';
import { networkFundService } from './networkFundService';
import {type LogOrderEventParams, orderLoggingService} from './orderLoggingService'; // ✅ Task 4.1
import { fastStartBonusService } from './fastStartBonusService';
import { infinityBonusService } from './infinityBonusService';
import { db } from '#db/db';
import { order as orderTable } from '#db/schema/orders';
import { deliveryStatusEnum, orderStatusEnum } from '#db/schema/enums';
import { eq } from 'drizzle-orm';

type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];
type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const orderLifecycleService = {
    /**
     * Хэндлер события Доставлен (delivered).
     * Начисления делегируются в ledgerService.processOrderPayment (идемпотентно).
     */
    async onDelivered(orderId: string): Promise<void> {
        if (!orderId) throw new Error('orderId is required');

        // ✅ Строго по Registry: начисляем только для реально доставленного заказа
        const [row] = await db
            .select({ deliveryStatus: orderTable.deliveryStatus })
            .from(orderTable)
            .where(eq(orderTable.id, orderId))
            .limit(1);

        if (!row) throw new Error('Order not found');
        if (row.deliveryStatus !== ('delivered' as DeliveryStatus)) return;

        // ✅ Логируем смену статуса доставки
        await orderLoggingService.logDeliveryStatusChange(orderId, 'in_transit', 'delivered');

        try {
            await ledgerService.processOrderPayment(orderId);
            // ✅ Логируем начисление бонусов (детали в ledgerService)

            // ✅ НОВОЕ: Обработка специальных бонусов (Fast Start, Infinity)
            // Fast Start и Infinity применяются ПОСЛЕ основных начислений
            await this.processSpecialBonuses(orderId);

            // ✅ ЭТАП 2.3: Рассчитать и сохранить bonuses_granted_rub
            await this.calculateAndSaveTotalBonuses(orderId);

        } catch (error) {
            const { errorMonitoringService } = await import('./errorMonitoringService');
            errorMonitoringService.logError(
                'error',
                `Failed to process bonuses for order ${orderId}`,
                error as Error,
            );
            // Пробрасываем ошибку дальше, чтобы контроллер знал о проблеме
            throw error;
        }
    },

    /**
     * ✅ Хэндлер события Оплачен (paid).
     * Проверяет условия для автоматического повышения до Partner.
     * Вызывается после успешной оплаты заказа.
     */
    async onPaid(orderId: string): Promise<void> {
        if (!orderId) throw new Error('orderId is required');

        // Получаем заказ с userId
        const [orderRow] = await db
            .select({
                userId: orderTable.userId,
                status: orderTable.status,
            })
            .from(orderTable)
            .where(eq(orderTable.id, orderId))
            .limit(1);

        if (!orderRow) throw new Error('Order not found');
        if (orderRow.status !== ('paid' as OrderStatus)) return;

        // ✅ Логируем смену статуса заказа
        await orderLoggingService.logStatusChange(orderId, 'new', 'paid');

        // ✅ Проверяем и выполняем upgrade до Partner (если условия выполнены)
        try {
            await tryUpgradeToPartner(orderRow.userId);
            await orderLoggingService.logEvent({
                orderId,
                event: 'user:upgraded_to_partner',
                meta: { userId: orderRow.userId },
            });
        } catch (error) {
            console.error(`Partner upgrade check failed for order ${orderId}:`, error);
        }

        // ✅ Начисляем средства в сетевой фонд
        try {
            await networkFundService.allocateFromOrder(orderId);
            await orderLoggingService.logEvent({
                orderId,
                event: 'network_fund:allocated',
                meta: { orderId },
            });
        } catch (error) {
            console.error(`Network fund allocation failed for order ${orderId}:`, error);
        }

        // ✅ Распределяем бонусы из сетевого фонда
        try {
            const distribution = await networkFundService.distributeBonuses(orderId);
            await orderLoggingService.logEvent({
                orderId,
                event: 'network_fund:distributed',
                meta: {
                    referralBonusesRub: distribution.referralBonusesRub,
                    binaryBonusesRub: distribution.binaryBonusesRub,
                    rankBonusesRub: distribution.rankBonusesRub,
                },
            });
        } catch (error) {
            console.error(`Network bonus distribution failed for order ${orderId}:`, error);
        }
    },

    /**
     * ✅ Обработка специальных бонусов (Fast Start, Infinity)
     * Registry.md:
     *   - Fast Start: 25% от L1 в течение 8 недель (перекрывает обычный L1)
     *   - Infinity: 0.25% от оборота ниже 16 уровня (правило 20/80)
     *
     * NOTE: Option 3% обрабатывается отдельно в конце месяца (cron job)
     */
    async processSpecialBonuses(orderId: string): Promise<void> {
        try {
            const { usersStorage } = await import('../storage/usersStorage');
            const ordersStorage = (await import('../storage/ordersStorage')).default;
            const mlmStorage = await import('../storage/mlmStorage');
            const { ledgerStorage } = await import('../storage/ledgerStorage');

            // Получить заказ
            const orderData = await ordersStorage.getById(orderId);
            if (!orderData) {
                console.log(`⚠️ Order ${orderId} not found for special bonuses`);
                return;
            }

            const buyerId = orderData.userId;
            const orderBaseRub = Number(orderData.orderBaseRub ?? 0);

            if (orderBaseRub <= 0) {
                console.log(`⚠️ Order ${orderId} has zero base, skip special bonuses`);
                return;
            }

            // Получить upline покупателя (до 100 уровней для Infinity)
            const upline = await mlmStorage.getUpline(buyerId, 100);

            // Обработать Fast Start и Infinity для каждого уровня upline
            for (const hop of upline) {
                const userId = hop.parentId;
                const level = hop.level;

                // Получить пользователя
                const user = await usersStorage.getUserById(userId);
                if (!user) continue;

                // Skip customers (Registry: customer не получает бонусов)
                if (user.mlmStatus === 'customer' && !user.canReceiveFirstlineBonus) {
                    continue;
                }

                // ────────────────────────────────────────────────────
                // 1. Fast Start Bonus (только L1, перекрывает обычный L1)
                // ────────────────────────────────────────────────────
                if (level === 1) {
                    const fastStartBonus = await fastStartBonusService.calculateFastStartBonus(
                        userId,
                        level,
                        orderBaseRub
                    );

                    if (fastStartBonus > 0) {
                        // Создать idempotency key
                        const idempotencyKey = `fast_start:${orderId}:${userId}`;

                        // Получить счета
                        const systemAccount = await ledgerStorage.ensureAccount(null, 'RUB', 'cash_rub', 'system');
                        const userAccount = await ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user');

                        // Начислить Fast Start бонус
                        try {
                            await ledgerStorage.createPosting({
                                debitAccountId: userAccount.id,
                                creditAccountId: systemAccount.id,
                                amount: fastStartBonus,
                                currency: 'RUB',
                                opType: 'fast_start',
                                userId,
                                orderId,
                                memo: `Fast Start bonus L1 for order ${orderId}`,
                                meta: {
                                    buyerId,
                                    orderBaseRub,
                                    level,
                                },
                            });

                            console.log(`✅ Fast Start bonus ${fastStartBonus} RUB granted to ${userId} for order ${orderId}`);
                        } catch (err: any) {
                            // Идемпотентность: если уже начислено, skip
                            if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
                                console.log(`⚠️ Fast Start bonus already granted for ${userId}:${orderId}`);
                            } else {
                                console.error(`❌ Failed to grant Fast Start bonus:`, err);
                            }
                        }
                    }
                }

                // ────────────────────────────────────────────────────
                // 2. Infinity Bonus (только уровни > 16)
                // ────────────────────────────────────────────────────
                if (level > 16) {
                    const shouldReceive = await infinityBonusService.shouldReceiveInfinityBonus(userId, buyerId);

                    if (shouldReceive) {
                        const infinityBonus = await infinityBonusService.calculateInfinityBonus(
                            userId,
                            orderBaseRub,
                            buyerId
                        );

                        if (infinityBonus > 0) {
                            // Создать idempotency key
                            const idempotencyKey = `infinity:${orderId}:${userId}`;

                            // Получить счета
                            const systemAccount = await ledgerStorage.ensureAccount(null, 'RUB', 'cash_rub', 'system');
                            const userAccount = await ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user');

                            // Начислить Infinity бонус
                            try {
                                await ledgerStorage.createPosting({
                                    debitAccountId: userAccount.id,
                                    creditAccountId: systemAccount.id,
                                    amount: infinityBonus,
                                    currency: 'RUB',
                                    opType: 'infinity',
                                    userId,
                                    orderId,
                                    memo: `Infinity bonus L${level} for order ${orderId}`,
                                    meta: {
                                        buyerId,
                                        orderBaseRub,
                                        level,
                                    },
                                });

                                console.log(`✅ Infinity bonus ${infinityBonus} RUB granted to ${userId} for order ${orderId}`);
                            } catch (err: any) {
                                // Идемпотентность
                                if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
                                    console.log(`⚠️ Infinity bonus already granted for ${userId}:${orderId}`);
                                } else {
                                    console.error(`❌ Failed to grant Infinity bonus:`, err);
                                }
                            }
                        }
                    }
                }
            }

            // Логирование
            await orderLoggingService.logEvent({
                orderId,
                event: 'special_bonuses:processed',
                meta: {
                    buyerId,
                    orderBaseRub,
                    uplineLevels: upline.length,
                },
            });

        } catch (error) {
            console.error(`❌ Failed to process special bonuses for order ${orderId}:`, error);
            // Не бросаем ошибку, чтобы не блокировать основные начисления
        }
    },

    /**
     * ✅ ЭТАП 2.3: Рассчитать и сохранить общую сумму начисленных бонусов
     * Registry.md: bonuses_granted_rub = сумма ВСЕХ бонусов (L1-L15 + Fast Start + Infinity)
     */
    async calculateAndSaveTotalBonuses(orderId: string): Promise<void> {
        try {
            const { ledgerStorage } = await import('../storage/ledgerStorage');
            const { posting } = await import('#db/schema/ledger');

            // Получить ВСЕ начисления (postings) связанные с этим заказом
            const postings = await db
                .select({
                    amount: posting.amount,
                    opType: posting.opType,
                })
                .from(posting)
                .where(eq(posting.orderId, orderId));

            // Суммировать только бонусные операции (НЕ VWC cashback, НЕ PV)
            const bonusTypes = [
                'referral_bonus',      // L1-L15 бонусы
                'fast_start',          // Fast Start 25%
                'infinity',            // Infinity 0.25%
            ];

            const totalBonuses = postings
                .filter(p => bonusTypes.includes(p.opType))
                .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

            // Обновить order.bonuses_granted_rub
            await db
                .update(orderTable)
                .set({ bonusesGrantedRub: totalBonuses.toFixed(2) })
                .where(eq(orderTable.id, orderId));

            console.log(`✅ Total bonuses ${totalBonuses.toFixed(2)} RUB saved for order ${orderId}`);

            // Логирование
            await orderLoggingService.logEvent({
                orderId,
                event: 'bonuses:total_calculated',
                meta: {
                    totalBonusesRub: totalBonuses,
                    postingsCount: postings.length,
                },
            });

        } catch (error) {
            console.error(`❌ Failed to calculate total bonuses for order ${orderId}:`, error);
            // Не бросаем ошибку, чтобы не блокировать основной процесс
        }
    },
};

export default orderLifecycleService;
