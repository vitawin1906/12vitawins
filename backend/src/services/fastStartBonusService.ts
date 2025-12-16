// backend/src/services/fastStartBonusService.ts
import { usersStorage } from '../storage/usersStorage';
import { db } from '#db/db';
import { settlementSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Fast Start Bonus Service
 * Registry.md 4.3:
 *   - 8 недель от activated_at
 *   - Первые 2 месяца (8 недель): 25% от L1
 *   - Далее: 20% от L1
 *   - Перекрывает обычный L1 бонус
 */

export interface FastStartSettings {
    fastStartWeeks: number; // default: 8
    fastStartStartPoint: 'registration' | 'first_paid' | 'activation'; // default: 'activation'
}

export class FastStartBonusService {
    /**
     * Получить настройки Fast Start из settlement_settings
     */
    async getFastStartSettings(): Promise<FastStartSettings> {
        const [active] = await db
            .select()
            .from(settlementSettings)
            .where(eq(settlementSettings.isActive, true))
            .limit(1);

        if (!active) {
            // Fallback значения из Registry.md
            return {
                fastStartWeeks: 8,
                fastStartStartPoint: 'activation',
            };
        }

        return {
            fastStartWeeks: Number(active.fastStartWeeks ?? 8),
            fastStartStartPoint: active.fastStartStartPoint ?? 'activation',
        };
    }

    /**
     * Проверить, находится ли пользователь в окне Fast Start
     * Registry.md: 8 недель от activated_at
     */
    async isWithinFastStartWindow(userId: string): Promise<boolean> {
        const user = await usersStorage.getUserById(userId);
        if (!user) return false;

        // Fast Start только для partner и partner_pro
        if (user.mlmStatus === 'customer') return false;

        // Проверить activatedAt
        if (!user.activatedAt) return false;

        const settings = await this.getFastStartSettings();
        const now = new Date();
        const activatedAt = new Date(user.activatedAt);
        const weeksPassed = this.getWeeksPassed(activatedAt, now);

        return weeksPassed <= settings.fastStartWeeks;
    }

    /**
     * Получить ставку Fast Start для пользователя
     * Registry.md:
     *   - Первые 2 месяца (8 недель): 25%
     *   - Далее (до конца окна): 20%
     *
     * NOTE: В Registry.md написано "первые 2 месяца → 25%, далее → 20%"
     * Но окно Fast Start = 8 недель. Предполагаем:
     *   - Весь период 8 недель = одна ставка
     *   - Либо: первые 8 недель = 25%, после = 20% (но это выходит за окно)
     *
     * Реализация: весь период Fast Start (8 недель) = 25% L1
     * После окна = обычный L1 (из levels_matrix)
     */
    async getFastStartRate(userId: string): Promise<number> {
        const isWithinWindow = await this.isWithinFastStartWindow(userId);

        if (!isWithinWindow) {
            return 0; // Не в окне Fast Start
        }

        // Весь период Fast Start = 25% от L1
        // Registry.md: "первые 2 месяца → 25%"
        return 0.25;
    }

    /**
     * Вычислить Fast Start бонус для конкретного уровня
     * @param userId - ID получателя бонуса
     * @param level - уровень в MLM дереве (1-15)
     * @param orderBaseRub - order_base заказа
     * @returns сумма бонуса в RUB
     */
    async calculateFastStartBonus(
        userId: string,
        level: number,
        orderBaseRub: number
    ): Promise<number> {
        // Fast Start применяется только к L1
        if (level !== 1) return 0;

        const rate = await this.getFastStartRate(userId);
        if (rate === 0) return 0;

        // Fast Start = 25% от L1 оборота
        const bonus = orderBaseRub * rate;
        return Math.round(bonus * 100) / 100; // round to 2 decimals
    }

    /**
     * Проверить, должен ли Fast Start бонус перекрыть обычный L1
     * Registry.md: "Перекрывает обычный L1"
     *
     * @returns true если Fast Start активен (перекрывает L1)
     */
    async shouldOverrideL1Bonus(userId: string): Promise<boolean> {
        return this.isWithinFastStartWindow(userId);
    }

    /**
     * Получить количество недель от даты активации
     */
    private getWeeksPassed(activatedAt: Date, now: Date): number {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const diff = now.getTime() - activatedAt.getTime();
        return Math.floor(diff / msPerWeek);
    }

    /**
     * Получить дату окончания окна Fast Start
     */
    async getFastStartEndDate(userId: string): Promise<Date | null> {
        const user = await usersStorage.getUserById(userId);
        if (!user || !user.activatedAt) return null;

        const settings = await this.getFastStartSettings();
        const activatedAt = new Date(user.activatedAt);
        const endDate = new Date(activatedAt.getTime() + settings.fastStartWeeks * 7 * 24 * 60 * 60 * 1000);

        return endDate;
    }

    /**
     * Получить информацию о статусе Fast Start для пользователя
     */
    async getFastStartStatus(userId: string): Promise<{
        isActive: boolean;
        rate: number;
        endDate: Date | null;
        weeksPassed: number;
        weeksTotal: number;
    }> {
        const user = await usersStorage.getUserById(userId);
        const settings = await this.getFastStartSettings();

        if (!user || !user.activatedAt) {
            return {
                isActive: false,
                rate: 0,
                endDate: null,
                weeksPassed: 0,
                weeksTotal: settings.fastStartWeeks,
            };
        }

        const now = new Date();
        const activatedAt = new Date(user.activatedAt);
        const weeksPassed = this.getWeeksPassed(activatedAt, now);
        const isActive = await this.isWithinFastStartWindow(userId);
        const rate = await this.getFastStartRate(userId);
        const endDate = await this.getFastStartEndDate(userId);

        return {
            isActive,
            rate,
            endDate,
            weeksPassed,
            weeksTotal: settings.fastStartWeeks,
        };
    }
}

export const fastStartBonusService = new FastStartBonusService();
