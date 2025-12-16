import { db } from '#db/db';
import { appUser } from '#db/schema/users';
import { ledgerStorage } from '#storage/ledgerStorage';
import { eq } from 'drizzle-orm';

/**
 * Freedom Shares — распределение средств между фондами
 *
 * Индексы:
 * [0] Personal Freedom
 * [1] Financial Freedom
 * [2] Time Freedom
 * [3] Social Freedom
 */
function isFreedomTuple(arr: number[]): arr is [number, number, number, number] {
    return arr.length === 4;
}

export type FreedomSharesArray = [number, number, number, number];

export interface FreedomSharesAllocation {
    personalFreedom: number;
    financialFreedom: number;
    timeFreedom: number;
    socialFreedom: number;
}

export const FREEDOM_SHARE_FUNDS = {
    PERSONAL: 0,
    FINANCIAL: 1,
    TIME: 2,
    SOCIAL: 3,
} as const;

export class FreedomSharesService {
    /**
     * Получить Freedom Shares пользователя
     */
    async getUserShares(userId: string): Promise<FreedomSharesArray> {
        const [user] = await db
            .select({ freedomShares: appUser.freedomShares })
            .from(appUser)
            .where(eq(appUser.id, userId))
            .limit(1);

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        return (user.freedomShares as FreedomSharesArray) ?? [25, 25, 25, 25];
    }

    /**
     * Обновить Freedom Shares
     */
    async updateUserShares(userId: string, shares: FreedomSharesArray): Promise<void> {

        // Жёстко формируем tuple — безопасно и без undefined
        const arr = [
            shares[0]!,
            shares[1]!,
            shares[2]!,
            shares[3]!,
        ] as [number, number, number, number];

        // Проверка суммы
        const sum = arr.reduce((acc, val) => acc + val, 0);
        if (Math.abs(sum - 100) > 0.01) {
            throw new Error(`Freedom Shares must sum to 100, got ${sum}`);
        }

        // Проверка границ — TS2322 FIXED
        for (let i = 0; i < 4; i++) {
            for (const [i, val] of arr.entries()) {
                if (val < 0 || val > 100) {
                    throw new Error(`Freedom Share ${i} must be between 0 and 100`);
                }
            }
        }

        await db
            .update(appUser)
            .set({
                freedomShares: arr as any,
                updatedAt: new Date(),
            })
            .where(eq(appUser.id, userId));
    }

    /**
     * Посчитать распределение суммы по фондам
     */
    async allocateAmount(userId: string, totalAmount: number): Promise<FreedomSharesAllocation> {
        const shares = await this.getUserShares(userId);

        return {
            personalFreedom: this.roundMoney((totalAmount * shares[0]) / 100),
            financialFreedom: this.roundMoney((totalAmount * shares[1]) / 100),
            timeFreedom: this.roundMoney((totalAmount * shares[2]) / 100),
            socialFreedom: this.roundMoney((totalAmount * shares[3]) / 100),
        };
    }

    /**
     * Ledger-проводки по фондам
     */
    async distributeFunds(params: {
        userId: string;
        totalAmount: number;
        orderId: string;
        opType: 'cashback' | 'referral_bonus' | 'network_bonus';
        memo?: string;
    }): Promise<FreedomSharesAllocation> {
        const { userId, totalAmount, orderId, opType, memo } = params;

        const allocation = await this.allocateAmount(userId, totalAmount);

        // Аккаунты фондов
        const accounts = await Promise.all([
            ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user'),
            ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user'),
            ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user'),
            ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user'),
        ]);

        const [personal, financial, time, social] = accounts;

        if (!personal || !financial || !time || !social) {
            throw new Error('Failed to create one of the Freedom accounts');
        }

        const systemAccount = await ledgerStorage.ensureAccount(
            null,
            'RUB',
            'cash_rub',
            'system'
        );

        if (!systemAccount) {
            throw new Error('System ledger account not available');
        }

        const funds = [
            { name: 'Personal Freedom', amount: allocation.personalFreedom, account: personal },
            { name: 'Financial Freedom', amount: allocation.financialFreedom, account: financial },
            { name: 'Time Freedom', amount: allocation.timeFreedom, account: time },
            { name: 'Social Freedom', amount: allocation.socialFreedom, account: social },
        ];

        for (const fund of funds) {
            if (fund.amount > 0.01) {
                await ledgerStorage.createPosting({
                    debitAccountId: fund.account.id,
                    creditAccountId: systemAccount.id,
                    amount: fund.amount,
                    currency: 'RUB',
                    opType,
                    userId,
                    orderId,
                    memo: memo ?? `${fund.name} allocation from ${opType}`,
                    meta: {
                        fundName: fund.name,
                        allocation,
                        totalAmount,
                    },
                });
            }
        }

        return allocation;
    }

    /**
     * Баланс фондов
     */
    async getFundBalances(userId: string): Promise<FreedomSharesAllocation> {
        const cashAccount = await ledgerStorage.ensureAccount(
            userId,
            'RUB',
            'cash_rub',
            'user'
        );

        if (!cashAccount) {
            throw new Error(`Cash account not found for user ${userId}`);
        }

        const totalBalance = await ledgerStorage.getBalance(cashAccount.id);
        const shares = await this.getUserShares(userId);

        return {
            personalFreedom: this.roundMoney((totalBalance * shares[0]) / 100),
            financialFreedom: this.roundMoney((totalBalance * shares[1]) / 100),
            timeFreedom: this.roundMoney((totalBalance * shares[2]) / 100),
            socialFreedom: this.roundMoney((totalBalance * shares[3]) / 100),
        };
    }

    /**
     * Проверка массива Shares
     */
    validateShares(shares: FreedomSharesArray): { valid: boolean; error?: string } {
        if (shares.length !== 4) {
            return { valid: false, error: 'Freedom Shares must contain 4 values' };
        }

        const sum = shares.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 100) > 0.01) {
            return { valid: false, error: `Freedom Shares must sum to 100, got ${sum}` };
        }

        for (const s of shares) {
            if (s < 0 || s > 100) {
                return { valid: false, error: 'Each value must be 0–100' };
            }
        }

        return { valid: true };
    }

    /**
     * Пресеты
     */
    getPresets() {
        return {
            balanced: {
                name: 'Сбалансированный',
                shares: [25, 25, 25, 25] as FreedomSharesArray,
                description: 'Равномерное распределение',
            },
            personal: {
                name: 'Личные цели',
                shares: [60, 20, 10, 10] as FreedomSharesArray,
                description: 'Фокус на личных целях',
            },
            investment: {
                name: 'Инвестиции',
                shares: [20, 60, 10, 10] as FreedomSharesArray,
                description: 'Фокус на накоплениях',
            },
            development: {
                name: 'Развитие',
                shares: [20, 20, 50, 10] as FreedomSharesArray,
                description: 'Фокус на обучении',
            },
            charity: {
                name: 'Благотворительность',
                shares: [30, 30, 10, 30] as FreedomSharesArray,
                description: 'Фокус на социальной поддержке',
            },
        };
    }

    private roundMoney(value: number): number {
        return Math.round(value * 100) / 100;
    }
}

export const freedomSharesService = new FreedomSharesService();
