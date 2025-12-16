// backend/src/services/infinityBonusService.ts
import { usersStorage } from '../storage/usersStorage';
import * as mlmStorage from '../storage/mlmStorage';
import { db } from '#db/db';
import { settlementSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Infinity Bonus Service
 * Registry.md 4.4:
 *   - 0.25% от оборота ниже 16 уровня
 *   - Правило 20/80: 20% лидеров получают 80% бонуса
 *   - Применяется только для партнеров с равным рангом
 */

export interface InfinitySettings {
    infinityRate: number; // default: 0.0025 (0.25%)
}

export interface InfinityDistribution {
    userId: string;
    amount: number;
    share: number; // доля от общего
}

export class InfinityBonusService {
    /**
     * Получить настройки Infinity из settlement_settings
     */
    async getInfinitySettings(): Promise<InfinitySettings> {
        const [active] = await db
            .select()
            .from(settlementSettings)
            .where(eq(settlementSettings.isActive, true))
            .limit(1);

        if (!active) {
            // Fallback значения из Registry.md
            return {
                infinityRate: 0.0025, // 0.25%
            };
        }

        return {
            infinityRate: Number(active.infinityRate ?? 0.0025),
        };
    }

    /**
     * Получить всех пользователей ниже 16 уровня (downline)
     * Используется для расчета группового оборота ниже 16 уровня
     */
    async getDownlineBeyondLevel16(userId: string): Promise<string[]> {
        // Получить всех пользователей в дереве ниже userId
        const allDownline = await mlmStorage.getDownline(userId, 100); // max depth

        // Отфильтровать тех, кто на уровне > 16 (используем уже вычисленный level)
        const beyond16: string[] = [];

        for (const node of allDownline) {
            if (node.level > 16) {
                beyond16.push(node.childId);
            }
        }

        return beyond16;
    }

    /**
     * Получить уровень пользователя targetId относительно rootId
     * @returns уровень (1 = прямой потомок, 2 = внук, и т.д.)
     */
    private async getLevelInTree(rootId: string, targetId: string): Promise<number> {
        // Получить upline для targetId
        const upline = await mlmStorage.getUpline(targetId, 100);

        // Найти rootId в upline
        const index = upline.findIndex((hop) => hop.parentId === rootId);

        if (index === -1) {
            // targetId не является потомком rootId
            return 0;
        }

        // level = index + 1 (т.к. index 0 = прямой родитель = level 1)
        return index + 1;
    }

    /**
     * Вычислить Infinity бонус для пользователя
     * Registry.md: 0.25% от оборота ниже 16 уровня
     *
     * @param userId - ID получателя бонуса
     * @param orderBaseRub - order_base заказа
     * @param buyerId - ID покупателя (проверка уровня)
     * @returns сумма бонуса в RUB
     */
    async calculateInfinityBonus(
        userId: string,
        orderBaseRub: number,
        buyerId: string
    ): Promise<number> {
        // Проверить, что покупатель ниже 16 уровня
        const level = await this.getLevelInTree(userId, buyerId);
        if (level <= 16) {
            return 0; // Infinity применяется только к уровням > 16
        }

        const settings = await this.getInfinitySettings();

        // Infinity = 0.25% от order_base
        const bonus = orderBaseRub * settings.infinityRate;
        return Math.round(bonus * 100) / 100; // round to 2 decimals
    }

    /**
     * Применить правило 20/80 для распределения Infinity бонуса
     * Registry.md: "20% лидеров получают 80% бонуса"
     *
     * @param users - список пользователей с одинаковым рангом
     * @param totalBonus - общая сумма Infinity бонуса
     * @returns распределение бонуса
     */
    async applyRule20_80(
        users: Array<{ userId: string; volumeRub: number }>,
        totalBonus: number
    ): Promise<InfinityDistribution[]> {
        if (users.length === 0) return [];

        // Сортировать по объему (descending)
        const sorted = [...users].sort((a, b) => b.volumeRub - a.volumeRub);

        // 20% лидеров
        const top20Count = Math.max(1, Math.ceil(sorted.length * 0.2));
        const top20 = sorted.slice(0, top20Count);
        const rest = sorted.slice(top20Count);

        // 80% бонуса для топ-20%
        const top20Bonus = totalBonus * 0.8;
        const restBonus = totalBonus * 0.2;

        const distribution: InfinityDistribution[] = [];

        // Распределить 80% бонуса пропорционально объему среди топ-20%
        const top20TotalVolume = top20.reduce((sum, u) => sum + u.volumeRub, 0);
        for (const user of top20) {
            const share = top20TotalVolume > 0 ? user.volumeRub / top20TotalVolume : 1 / top20.length;
            const amount = top20Bonus * share;
            distribution.push({
                userId: user.userId,
                amount: Math.round(amount * 100) / 100,
                share,
            });
        }

        // Распределить 20% бонуса пропорционально объему среди остальных
        if (rest.length > 0) {
            const restTotalVolume = rest.reduce((sum, u) => sum + u.volumeRub, 0);
            for (const user of rest) {
                const share = restTotalVolume > 0 ? user.volumeRub / restTotalVolume : 1 / rest.length;
                const amount = restBonus * share;
                distribution.push({
                    userId: user.userId,
                    amount: Math.round(amount * 100) / 100,
                    share,
                });
            }
        }

        return distribution;
    }

    /**
     * Проверить, должен ли пользователь получать Infinity бонус
     * Registry.md: "для партнеров с равным рангом"
     *
     * @param userId - ID пользователя
     * @param buyerId - ID покупателя
     * @returns true если применяется Infinity
     */
    async shouldReceiveInfinityBonus(userId: string, buyerId: string): Promise<boolean> {
        const user = await usersStorage.getUserById(userId);
        const buyer = await usersStorage.getUserById(buyerId);

        if (!user || !buyer) return false;

        // Только partner и partner_pro
        if (user.mlmStatus === 'customer') return false;

        // Проверить уровень (должен быть > 16)
        const level = await this.getLevelInTree(userId, buyerId);
        if (level <= 16) return false;

        // Проверить равный или выше ранг
        // Registry: "для партнеров с равным рангом"
        // Предполагаем: получатель должен иметь >= ранга покупателя
        const rankOrder = { customer: 0, partner: 1, partner_pro: 2 } as const;
        const userRank = rankOrder[user.mlmStatus as keyof typeof rankOrder] ?? 0;
        const buyerRank = rankOrder[buyer.mlmStatus as keyof typeof rankOrder] ?? 0;

        return userRank >= buyerRank;
    }

    /**
     * Получить всех пользователей с равным рангом ниже 16 уровня
     * Используется для применения правила 20/80
     */
    async getEligibleUsersForInfinity(
        rootUserId: string,
        targetRank: 'partner' | 'partner_pro'
    ): Promise<Array<{ userId: string; volumeRub: number }>> {
        // Получить всех потомков ниже 16 уровня
        const downline = await this.getDownlineBeyondLevel16(rootUserId);

        const eligible: Array<{ userId: string; volumeRub: number }> = [];

        for (const userId of downline) {
            const user = await usersStorage.getUserById(userId);
            if (!user) continue;

            // Проверить ранг
            if (user.mlmStatus !== targetRank) continue;

            // TODO: Получить volume (оборот) пользователя
            // Пока используем заглушку
            const volumeRub = 0;

            eligible.push({ userId, volumeRub });
        }

        return eligible;
    }
}

export const infinityBonusService = new InfinityBonusService();
