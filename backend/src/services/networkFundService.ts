// backend/src/services/networkFundService.ts
import { db } from '#db/db';
import { order } from '#db/schema/orders';
import { ledgerStorage } from '#storage/ledgerStorage';
import { matrixPlacementService } from './matrixPlacementService';
import { eq, sql, and, gte } from 'drizzle-orm';
import { settlementSettingsRuntime } from '#config/settlementSettings';

/**
 * Network Fund Service
 * Управление сетевым фондом для распределения бонусов по MLM структуре
 *
 * Network Fund - это процент от каждого заказа, который идёт в общий фонд
 * для последующего распределения между участниками сети в виде:
 * - Реферальных бонусов (уровни 1-15)
 * - Бинарных бонусов (из матрицы)
 * - Ранговых бонусов
 * - Leadership бонусов
 */

export interface NetworkFundAllocation {
    orderId: string;
    totalFundRub: number;
    referralBonusesRub: number;
    binaryBonusesRub: number;
    rankBonusesRub: number;
    unallocatedRub: number;
}

export class NetworkFundService {
    /**
     * Получить баланс сетевого фонда
     */
    async getNetworkFundBalance(): Promise<number> {
        const fundAccount = await ledgerStorage.ensureAccount(null, 'RUB', 'network_fund', 'system');
        return ledgerStorage.getBalance(fundAccount.id);
    }

    /**
     * Начислить средства в сетевой фонд из заказа
     * Вызывается при подтверждении/оплате заказа
     */
    async allocateFromOrder(orderId: string): Promise<void> {
        return db.transaction(async (tx) => {
            // 1. Получить заказ
            const [orderRow] = await tx
                .select({
                    id: order.id,
                    userId: order.userId,
                    networkFundRub: order.networkFundRub,
                    totalPayableRub: order.totalPayableRub,
                })
                .from(order)
                .where(eq(order.id, orderId))
                .limit(1);

            if (!orderRow) {
                throw new Error(`Order ${orderId} not found`);
            }

            const fundAmount = Number(orderRow.networkFundRub ?? 0);
            if (fundAmount <= 0) {
                return; // Нечего распределять
            }

            // 2. Создать проводку: пополнить network_fund счёт
            const fundAccount = await ledgerStorage.ensureAccount(
                null,
                'RUB',
                'network_fund',
                'system'
            );
            const systemCashAccount = await ledgerStorage.ensureAccount(
                null,
                'RUB',
                'cash_rub',
                'system'
            );

            // Дебет network_fund <- Кредит system_cash
            await ledgerStorage.createPosting({
                debitAccountId: fundAccount.id,
                creditAccountId: systemCashAccount.id,
                amount: fundAmount,
                currency: 'RUB',
                opType: 'network_fund_allocation',
                userId: orderRow.userId,
                orderId: orderRow.id,
                memo: `Network fund allocation from order ${orderId}`,
                meta: {
                    orderTotal: orderRow.totalPayableRub,
                    fundPercent: settlementSettingsRuntime.networkFundPercent,
                },
            });
        });
    }

    /**
     * Распределить бонусы из сетевого фонда для конкретного заказа
     * Вызывается после allocateFromOrder
     *
     * Распределяет средства на:
     * 1. Реферальные бонусы (по уровням upline)
     * 2. Бинарные бонусы (по матрице)
     * 3. Ранговые бонусы (лидерские)
     */
    async distributeBonuses(orderId: string): Promise<NetworkFundAllocation> {
        return db.transaction(async (tx) => {
            // 1. Получить заказ
            const [orderRow] = await tx
                .select({
                    id: order.id,
                    userId: order.userId,
                    networkFundRub: order.networkFundRub,
                    pvEarned: order.pvEarned,
                })
                .from(order)
                .where(eq(order.id, orderId))
                .limit(1);

            if (!orderRow) {
                throw new Error(`Order ${orderId} not found`);
            }

            const totalFundRub = Number(orderRow.networkFundRub ?? 0);
            if (totalFundRub <= 0) {
                return {
                    orderId,
                    totalFundRub: 0,
                    referralBonusesRub: 0,
                    binaryBonusesRub: 0,
                    rankBonusesRub: 0,
                    unallocatedRub: 0,
                };
            }

            let distributedRub = 0;

            // 2. Распределить реферальные бонусы (40% от фонда)
            const referralBudget = totalFundRub * 0.4;
            const referralBonusesRub = await this.distributeReferralBonuses(
                orderRow.userId,
                orderId,
                referralBudget,
                orderRow.pvEarned ?? 0
            );
            distributedRub += referralBonusesRub;

            // 3. Распределить бинарные бонусы (40% от фонда)
            const binaryBudget = totalFundRub * 0.4;
            const binaryBonusesRub = await this.distributeBinaryBonuses(
                orderRow.userId,
                orderId,
                binaryBudget,
                orderRow.pvEarned ?? 0
            );
            distributedRub += binaryBonusesRub;

            // 4. Распределить ранговые бонусы (20% от фонда)
            const rankBudget = totalFundRub * 0.2;
            const rankBonusesRub = await this.distributeRankBonuses(
                orderRow.userId,
                orderId,
                rankBudget
            );
            distributedRub += rankBonusesRub;

            // 5. Остаток остаётся в фонде
            const unallocatedRub = totalFundRub - distributedRub;

            return {
                orderId,
                totalFundRub,
                referralBonusesRub,
                binaryBonusesRub,
                rankBonusesRub,
                unallocatedRub,
            };
        });
    }

    /**
     * Распределить реферальные бонусы по уровням upline
     */
    private async distributeReferralBonuses(
        userId: string,
        orderId: string,
        budget: number,
        pvEarned: number
    ): Promise<number> {
        // TODO: Реализовать распределение по уровням 1-15
        // Пока заглушка - возвращаем 0
        return 0;
    }

    /**
     * Распределить бинарные бонусы по матрице
     */
    private async distributeBinaryBonuses(
        userId: string,
        orderId: string,
        budget: number,
        pvEarned: number
    ): Promise<number> {
        // 1. Обновить объём ноги в матрице
        const placement = await matrixPlacementService.getUserPlacement(userId);
        if (!placement || !placement.parentId) {
            return 0; // Нет родителя в матрице
        }

        // 2. Определить в какую ногу добавить объём
        const leg = placement.position === 'left' ? 'left' : 'right';
        await matrixPlacementService.updateLegVolume(placement.parentId, leg, pvEarned);

        // 3. TODO: Рассчитать и начислить бинарный бонус родителю
        // Бинарный бонус = процент от меньшей ноги
        // Пока заглушка
        return 0;
    }

    /**
     * Распределить ранговые бонусы
     */
    private async distributeRankBonuses(
        userId: string,
        orderId: string,
        budget: number
    ): Promise<number> {
        // TODO: Реализовать распределение по рангам
        // Пока заглушка
        return 0;
    }

    /**
     * Вывести средства из сетевого фонда (для выплат)
     */
    async withdrawFromFund(
        recipientUserId: string,
        amountRub: number,
        reason: string,
        orderId?: string
    ): Promise<void> {
        if (amountRub <= 0) {
            throw new Error('Amount must be positive');
        }

        // 1. Получить счета
        const fundAccount = await ledgerStorage.ensureAccount(null, 'RUB', 'network_fund', 'system');
        const userAccount = await ledgerStorage.ensureAccount(recipientUserId, 'RUB', 'cash_rub', 'user');

        // 2. Проверить баланс фонда
        const fundBalance = await ledgerStorage.getBalance(fundAccount.id);
        if (fundBalance < amountRub) {
            throw new Error(
                `Insufficient network fund balance: ${fundBalance} RUB, requested: ${amountRub} RUB`
            );
        }

        await ledgerStorage.createPosting({
            debitAccountId: userAccount.id,
            creditAccountId: fundAccount.id,
            amount: amountRub,
            currency: 'RUB',
            opType: 'network_bonus',
            userId: recipientUserId,
            memo: reason,
            ...(orderId ? { orderId } : {}), // 🔥 FIX
        });
    }

    /**
     * Получить статистику по сетевому фонду
     */
    async getFundStats(): Promise<{
        totalBalance: number;
        totalAllocated: number;
        totalDistributed: number;
        pendingDistribution: number;
    }> {
        const balance = await this.getNetworkFundBalance();

        // TODO: Добавить запросы для получения статистики из ledger
        return {
            totalBalance: balance,
            totalAllocated: 0, // TODO: сумма всех allocations
            totalDistributed: 0, // TODO: сумма всех distributions
            pendingDistribution: balance, // TODO: разница между allocated и distributed
        };
    }
}

// Singleton экземпляр
export const networkFundService = new NetworkFundService();
