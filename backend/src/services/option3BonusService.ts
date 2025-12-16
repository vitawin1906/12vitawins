// backend/src/services/option3BonusService.ts
import { usersStorage } from '../storage/usersStorage';
import { ordersStorage } from '../storage/ordersStorage';
import * as mlmStorage from '../storage/mlmStorage';
import { ledgerStorage } from '../storage/ledgerStorage';
import { db } from '#db/db';
import { settlementSettings, order } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Option 3% Bonus Service
 * Registry.md 4.5:
 *   - 3% от группового оборота (ГО)
 *   - Месячное начисление (в конце периода)
 *   - Только для пользователей с option3_enabled = true
 */

export interface Option3Settings {
    optionBonusPercent: number; // default: 3
}

export interface MonthlyOption3Result {
    userId: string;
    period: string; // YYYY-MM
    groupVolumeRub: number;
    bonusAmount: number;
    processed: boolean;
}

export class Option3BonusService {
    /**
     * Получить настройки Option 3% из settlement_settings
     */
    async getOption3Settings(): Promise<Option3Settings> {
        const [active] = await db
            .select()
            .from(settlementSettings)
            .where(eq(settlementSettings.isActive, true))
            .limit(1);

        if (!active) {
            // Fallback значения из Registry.md
            return {
                optionBonusPercent: 3,
            };
        }

        return {
            optionBonusPercent: Number(active.optionBonusPercent ?? 3),
        };
    }

    /**
     * Проверить, включен ли Option 3% для пользователя
     */
    async isOption3Enabled(userId: string): Promise<boolean> {
        const user = await usersStorage.getUserById(userId);
        if (!user) return false;

        // Option 3% только для partner и partner_pro
        if (user.mlmStatus === 'customer') return false;

        return user.option3Enabled === true;
    }

    /**
     * Получить групповой оборот (ГО) для пользователя за период
     * ГО = сумма order_base_rub всех заказов в downline (включая свои)
     *
     * @param userId - ID пользователя
     * @param startDate - начало периода
     * @param endDate - конец периода
     * @returns сумма в RUB
     */
    async getGroupVolume(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        // Получить всех потомков
        const downline = await mlmStorage.getDownline(userId, 100); // все уровни

        // Добавить самого пользователя
        const allUsers = [userId, ...downline];

        // Получить сумму order_base_rub для всех заказов в статусе 'delivered'
        const result = await db
            .select({
                total: sql<number>`COALESCE(SUM(${order.orderBaseRub}), 0)`,
            })
            .from(order)
            .where(
                and(
                    sql`${order.userId} = ANY(${allUsers})`,
                    eq(order.status, 'delivered'),
                    gte(order.deliveredAt, startDate),
                    lte(order.deliveredAt, endDate)
                )
            );

        const total = result[0]?.total ?? 0;
        return Number(total);
    }

    /**
     * Вычислить Option 3% бонус для пользователя за период
     * Registry.md: 3% от группового оборота
     *
     * @param userId - ID пользователя
     * @param startDate - начало периода
     * @param endDate - конец периода
     * @returns сумма бонуса в RUB
     */
    async calculateMonthlyOption3Bonus(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        // Проверить, включен ли Option 3%
        const isEnabled = await this.isOption3Enabled(userId);
        if (!isEnabled) return 0;

        // Получить групповой оборот
        const groupVolume = await this.getGroupVolume(userId, startDate, endDate);

        // Получить настройки
        const settings = await this.getOption3Settings();

        // Option 3% = 3% от ГО
        const bonus = groupVolume * (settings.optionBonusPercent / 100);
        return Math.round(bonus * 100) / 100; // round to 2 decimals
    }

    /**
     * Обработать месячное начисление Option 3% для всех пользователей
     * Запускается в конце месяца (cron job)
     *
     * @param year - год
     * @param month - месяц (1-12)
     * @returns список результатов
     */
    async processMonthlyOption3Distribution(
        year: number,
        month: number
    ): Promise<MonthlyOption3Result[]> {
        // Получить границы месяца
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const period = `${year}-${String(month).padStart(2, '0')}`;

        // Получить всех пользователей с option3_enabled = true
        const eligibleUsers = await this.getEligibleUsers();

        const results: MonthlyOption3Result[] = [];

        for (const user of eligibleUsers) {
            try {
                // Вычислить бонус
                const bonusAmount = await this.calculateMonthlyOption3Bonus(
                    user.id,
                    startDate,
                    endDate
                );

                if (bonusAmount <= 0) {
                    results.push({
                        userId: user.id,
                        period,
                        groupVolumeRub: 0,
                        bonusAmount: 0,
                        processed: false,
                    });
                    continue;
                }

                // Начислить бонус через ledger
                await this.grantOption3Bonus(user.id, bonusAmount, period);

                const groupVolumeRub = await this.getGroupVolume(user.id, startDate, endDate);

                results.push({
                    userId: user.id,
                    period,
                    groupVolumeRub,
                    bonusAmount,
                    processed: true,
                });

                console.log(
                    `✅ Option 3% granted: ${bonusAmount} RUB to ${user.id} for ${period}`
                );
            } catch (err: any) {
                console.error(
                    `❌ Failed to process Option 3% for ${user.id}:`,
                    err.message
                );
                results.push({
                    userId: user.id,
                    period,
                    groupVolumeRub: 0,
                    bonusAmount: 0,
                    processed: false,
                });
            }
        }

        return results;
    }

    /**
     * Начислить Option 3% бонус через ledger
     */
    private async grantOption3Bonus(
        userId: string,
        bonusAmount: number,
        period: string
    ): Promise<void> {
        // Создать idempotency key
        const idempotencyKey = `option3_bonus:${userId}:${period}`;

        // Получить счета
        const systemAccount = await ledgerStorage.ensureAccount(null, 'RUB', 'cash_rub', 'system');
        const userAccount = await ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user');

        // Создать транзакцию
        await ledgerStorage.createPosting({
            debitAccountId: userAccount.id,
            creditAccountId: systemAccount.id,
            amount: bonusAmount,
            currency: 'RUB',
            opType: 'option_bonus',
            userId,
            memo: `Option 3% bonus for ${period}`,
            meta: {
                period,
                bonusAmount,
            },
        });
    }

    /**
     * Получить всех пользователей с option3_enabled = true
     */
    private async getEligibleUsers(): Promise<Array<{ id: string; mlmStatus: string }>> {
        const users = await usersStorage.listUsers({ limit: 10000, offset: 0 });

        return users.filter(
            (u: any) =>
                u.option3Enabled === true &&
                (u.mlmStatus === 'partner' || u.mlmStatus === 'partner_pro')
        );
    }

    /**
     * Получить информацию о Option 3% для пользователя
     */
    async getOption3Status(userId: string): Promise<{
        isEnabled: boolean;
        rate: number;
        lastPeriod: string | null;
        lastBonus: number | null;
    }> {
        const user = await usersStorage.getUserById(userId);

        if (!user) {
            return {
                isEnabled: false,
                rate: 0,
                lastPeriod: null,
                lastBonus: null,
            };
        }

        const settings = await this.getOption3Settings();
        const isEnabled = user.option3Enabled === true;

        // TODO: Получить последнее начисление из ledger

        return {
            isEnabled,
            rate: settings.optionBonusPercent,
            lastPeriod: null,
            lastBonus: null,
        };
    }
}

export const option3BonusService = new Option3BonusService();
