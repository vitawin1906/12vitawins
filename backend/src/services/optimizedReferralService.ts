// src/services/optimizedReferralService.ts
import crypto from 'crypto';
import { db } from '#db/db';
import { eq, inArray } from 'drizzle-orm';
import {
    appUser,
    order,
    ledgerTxn,
    ledgerPosting,
} from '#db/schema';
import { ledgerStorage } from '#storage/ledgerStorage';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Жёстко типизированные ставки для уровней 1..3 */
function getBonusRate(level: 1 | 2 | 3): number {
    const rates = { 1: 0.10, 2: 0.05, 3: 0.025 } as const;
    return rates[level];
}

type UserRow = typeof appUser.$inferSelect;

export class OptimizedReferralService {
    /**
     * Полная структура реферальной сети без N+1
     * Связь строится по appliedReferralCode (хранит telegramId пригласившего).
     */
    async getReferralNetworkOptimized() {
        const allUsers = await db
            .select({
                id: appUser.id,
                firstName: appUser.firstName,
                telegramId: appUser.telegramId,
                referralCode: appUser.referralCode,
                appliedReferralCode: appUser.appliedReferralCode,
                createdAt: appUser.createdAt,
            })
            .from(appUser);

        // карты для быстрого доступа
        const byId = new Map<string, any>();
        const byTelegram = new Map<string, any>();

        allUsers.forEach((u) => {
            const node = { ...u, children: [], level: 0, totalNetwork: 0 };
            byId.set(u.id, node);
            if (u.telegramId) byTelegram.set(String(u.telegramId), node);
        });

        // строим дерево: parent — по appliedReferralCode (telegramId)
        byId.forEach((node) => {
            const parent = node.appliedReferralCode ? byTelegram.get(String(node.appliedReferralCode)) : undefined;
            if (parent) {
                parent.children.push(node);
                node.level = parent.level + 1;
            }
        });

        return this.calculateNetworkMetrics(byId);
    }

    /**
     * Проверка целостности: appliedReferralCode должен ссылаться на существующий telegramId
     */
    async validateReferralIntegrityBatch() {
        const all = await db.select({ id: appUser.id, firstName: appUser.firstName, appliedReferralCode: appUser.appliedReferralCode })
            .from(appUser);

        const codes = Array.from(new Set(all.map(u => u.appliedReferralCode).filter(Boolean) as string[]));
        const refs = codes.length
            ? await db.select({ telegramId: appUser.telegramId }).from(appUser).where(inArray(appUser.telegramId, codes))
            : [];
        const validSet = new Set(refs.map(r => String(r.telegramId)));

        const issues: string[] = [];
        all.forEach((u) => {
            if (u.appliedReferralCode && !validSet.has(String(u.appliedReferralCode))) {
                issues.push(`⚠️ Пользователь ${u.firstName ?? '(без имени)'} ссылается на несуществующего реферера ${u.appliedReferralCode}`);
            }
        });

        return { valid: issues.length === 0, issues, checkedCount: all.length };
    }

    /**
     * Начисление реферальных бонусов по заказу в транзакции (через леджер)
     * Распределяем 50% от order_base по уровням 1..3: 10% / 5% / 2.5%
     * ИДЕМПОТЕНТНО: operationId = `order:${orderId}:referral_split:v1`
     */
    async calculateBonusesWithTransaction(orderId: string) {
        const opId = `order:${orderId}:referral_split:v1`;

        return db.transaction(async (tx) => {
            // уже начисляли?
            const existing = await tx.query.ledgerTxn.findFirst({
                where: eq(ledgerTxn.operationId, opId),
            });
            if (existing) {
                const postings = await tx.select({ id: ledgerPosting.id }).from(ledgerPosting).where(eq(ledgerPosting.txnId, existing.id));
                return { success: true as const, levelsPaid: postings.length, networkFund: NaN };
            }

            const ord = await tx.query.order.findFirst({ where: eq(order.id, orderId) });
            if (!ord) return { success: false as const, reason: 'ORDER_NOT_FOUND' };

            const buyer = await tx.query.appUser.findFirst({ where: eq(appUser.id, ord.userId) });
            if (!buyer || !buyer.appliedReferralCode) {
                return { success: false as const, reason: 'NO_REFERRER' };
            }

            const orderBase = Number(ord.orderBaseRub ?? 0);
            if (!(orderBase > 0)) {
                return { success: false as const, reason: 'ORDER_BASE_ZERO' };
            }

            // 50% — сетевой фонд по Registry
            const networkFund = r2(orderBase * 0.50);

            // создаём заголовок транзакции
            const [txn] = await tx
                .insert(ledgerTxn)
                .values({
                    operationId: opId,
                    opType: 'reward', // совместим с ledgerOpTypeEnum
                    externalRef: `order:${orderId}`,
                    userId: buyer.id,
                    orderId: ord.id,
                    meta: { kind: 'referral_split', orderBaseRub: orderBase },
                })
                .returning({ id: ledgerTxn.id });

            if (!txn) throw new Error('Failed to create ledger transaction');

            // системный счёт фонда
            const sysFund = await ledgerStorage.ensureAccount(
                null,
                'RUB',
                'network_fund',
                'system',
            );

            // цепь аплайнов по appliedReferralCode (telegramId ↑)
            const chain = await this.getReferralChain(tx, String(buyer.appliedReferralCode));
            const postings: Array<typeof ledgerPosting.$inferInsert> = [];

            // уровни 1..3
            for (let lvl: 1 | 2 | 3 = 1; lvl <= 3 && lvl <= (chain.length as number); lvl = (lvl + 1) as 1 | 2 | 3) {
                const upline = chain[lvl - 1];
                const share = r2(networkFund * getBonusRate(lvl));
                if (share <= 0) continue;

                const uplineReferral = await ledgerStorage.ensureAccount(
                    upline?.id || '0',
                    'RUB',
                    'referral',
                    'user',
                );

                postings.push({
                    txnId: txn.id,
                    debitAccountId: sysFund.id,
                    creditAccountId: uplineReferral.id,
                    amount: share.toFixed(2),
                    currency: 'RUB',
                    memo: `Referral L${lvl}`,
                });
            }

            if (postings.length) {
                await tx.insert(ledgerPosting).values(postings);
            }

            return { success: true as const, levelsPaid: postings.length, networkFund };
        });
    }

    /** Получаем до 3 аплайнов вверх по цепочке: telegramId → appliedReferralCode → ... */
    private async getReferralChain(tx: any, referrerTelegramId: string) {
        const chain: UserRow[] = [];
        let current = referrerTelegramId;

        for (let i = 0; i < 3 && current; i++) {
            const ref = await tx.query.appUser.findFirst({ where: eq(appUser.telegramId, current) });
            if (!ref) break;
            chain.push(ref);
            current = ref.appliedReferralCode ?? '';
        }
        return chain;
    }

    private calculateNetworkMetrics(mapById: Map<string, any>) {
        const metrics = {
            totalUsers: mapById.size,
            maxDepth: 0,
            levelDistribution: { 1: 0, 2: 0, 3: 0 },
        };

        mapById.forEach((n) => {
            metrics.maxDepth = Math.max(metrics.maxDepth, n.level);
            if (n.level >= 1 && n.level <= 3) metrics.levelDistribution[n.level as 1 | 2 | 3]++;
            n.totalNetwork = this.countNetworkSize(n);
        });

        return { networkMap: mapById, metrics };
    }

    private countNetworkSize(node: any): number {
        let count = node.children?.length ?? 0;
        node.children?.forEach((c: any) => { count += this.countNetworkSize(c); });
        return count;
    }
}

export const optimizedReferralService = new OptimizedReferralService();
