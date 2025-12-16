// backend/src/services/partnerUpgradeService.ts
import { db } from '#db/db';
import { appUser } from '#db/schema/users';
import { order } from '#db/schema/orders';
import { eq, and, sql, gte } from 'drizzle-orm';

/**
 * Partner Upgrade Service
 * Автоматически повышает пользователя до статуса Partner при выполнении условий
 *
 * Условия для автоматического повышения до Partner:
 * 1. Текущий статус: customer
 * 2. Минимальная сумма заказов: >= порогового значения (например, 10000 RUB)
 * 3. Минимум завершённых заказов: >= N (например, 2 заказа)
 * 4. Статус заказов: paid или completed
 *
 * Логика срабатывает:
 * - После успешной оплаты заказа (в orderLifecycleService)
 * - Может быть вызвана вручную для конкретного пользователя
 */

export interface PartnerUpgradeConfig {
    /** Минимальная сумма всех оплаченных заказов (RUB) */
    minTotalOrdersRub: number;

    /** Минимальное количество завершённых заказов */
    minOrderCount: number;

    /** Включить логирование */
    enableLogging: boolean;
}

const DEFAULT_CONFIG: PartnerUpgradeConfig = {
    minTotalOrdersRub: 10000, // 10 000 ₽
    minOrderCount: 2,
    enableLogging: true,
};

export class PartnerUpgradeService {
    private config: PartnerUpgradeConfig;

    constructor(config: Partial<PartnerUpgradeConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Проверить и выполнить upgrade пользователя до Partner
     * @returns true если upgrade выполнен, false если условия не выполнены
     */
    async checkAndUpgradeUser(userId: string): Promise<boolean> {
        // 1. Получить пользователя
        const [user] = await db
            .select({
                id: appUser.id,
                mlmStatus: appUser.mlmStatus,
                firstName: appUser.firstName,
                telegramId: appUser.telegramId,
            })
            .from(appUser)
            .where(eq(appUser.id, userId))
            .limit(1);

        if (!user) {
            this.log(`User ${userId} not found`);
            return false;
        }

        // 2. Проверить что пользователь ещё customer
        if (user.mlmStatus !== 'customer') {
            this.log(`User ${userId} already has status ${user.mlmStatus}, skipping upgrade`);
            return false;
        }

        // 3. Проверить условия для upgrade
        const eligible = await this.checkEligibility(userId);
        if (!eligible) {
            this.log(`User ${userId} not eligible for partner upgrade yet`);
            return false;
        }

        // 4. Выполнить upgrade
        await this.performUpgrade(userId);

        this.log(`✅ User ${userId} (${user.firstName || user.telegramId}) upgraded to Partner`);
        return true;
    }

    /**
     * Проверить выполнение условий для upgrade
     */
    private async checkEligibility(userId: string): Promise<boolean> {
        // Получить статистику по заказам пользователя
        const stats = await db.execute<{
            totalOrders: string;
            orderCount: string;
            totalRub: string;
        }>(sql`
            SELECT
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status IN ('paid', 'completed') THEN 1 END) as order_count,
                COALESCE(SUM(
                    CASE
                        WHEN status IN ('paid', 'completed')
                        THEN CAST(total_payable_rub AS NUMERIC)
                        ELSE 0
                    END
                ), 0) as total_rub
            FROM ${order}
            WHERE user_id = ${userId}
        `);

        const row = stats.rows[0];
        if (!row) return false;

        const orderCount = Number(row.orderCount ?? row.orderCount ?? 0);
        const totalRub = Number(row.totalRub ?? row.totalRub ?? 0);

        this.log(
            `User ${userId}: ${orderCount} paid orders, ${totalRub.toFixed(2)} RUB total ` +
            `(need ${this.config.minOrderCount} orders, ${this.config.minTotalOrdersRub} RUB)`
        );

        // Проверить условия
        return (
            orderCount >= this.config.minOrderCount &&
            totalRub >= this.config.minTotalOrdersRub
        );
    }

    /**
     * Выполнить upgrade пользователя до Partner
     */
    private async performUpgrade(userId: string): Promise<void> {
        await db.transaction(async (tx) => {
            // 1. Обновить mlmStatus на 'partner'
            await tx
                .update(appUser)
                .set({
                    mlmStatus: 'partner',
                    activatedAt: new Date(), // Записываем дату активации
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(appUser.id, userId),
                        eq(appUser.mlmStatus, 'customer') // Double-check статус
                    )
                );

            // 2. В будущем здесь можно:
            // - Создать notification о повышении
            // - Начислить welcome-бонус для Partner
            // - Отправить Telegram уведомление
            // - Записать событие в аналитику
        });
    }

    /**
     * Batch обработка: проверить всех customers на возможность upgrade
     * Полезно для разового апгрейда существующих пользователей
     */
    async upgradeEligibleCustomers(limit = 100): Promise<{ upgraded: number; checked: number }> {
        // Получить всех customers
        const customers = await db
            .select({ id: appUser.id })
            .from(appUser)
            .where(eq(appUser.mlmStatus, 'customer'))
            .limit(limit);

        let upgraded = 0;
        for (const customer of customers) {
            const result = await this.checkAndUpgradeUser(customer.id);
            if (result) upgraded++;
        }

        this.log(`Batch upgrade completed: ${upgraded}/${customers.length} users upgraded`);
        return { upgraded, checked: customers.length };
    }

    private log(message: string): void {
        if (this.config.enableLogging) {
            console.log(`[PartnerUpgradeService] ${message}`);
        }
    }
}

// Singleton экземпляр
export const partnerUpgradeService = new PartnerUpgradeService();

/**
 * Хелпер для интеграции в orderLifecycleService
 * Вызывать после успешной оплаты заказа
 */
export async function tryUpgradeToPartner(userId: string): Promise<void> {
    try {
        await partnerUpgradeService.checkAndUpgradeUser(userId);
    } catch (error) {
        console.error(`Error in partner upgrade for user ${userId}:`, error);
        // Не бросаем ошибку дальше - upgrade не должен блокировать основной флоу
    }
}
