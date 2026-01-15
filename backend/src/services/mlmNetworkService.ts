// src/services/mlmNetworkService.ts
import { db } from '#db/db';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { appUser, order, ledgerAccount, ledgerPosting, ledgerTxn } from '#db/schema';
import { deliveryStatusEnum } from '#db/schema/enums';

/* =========================
   Типы
   ========================= */

export interface UserNetworkStats {
    userId: string;
    firstName: string | null;
    username: string | null;
    telegramId: string;
    referralCode: string;
    currentLevel: number;

    personalVolume: {
        totalAmount: number;
        totalPV: number;
        ordersCount: number;
    };

    groupVolume: {
        totalAmount: number;
        totalPV: number;
        ordersCount: number;
    };

    network: {
        totalReferrals: number;
        directReferrals: number; // всегда число
        levelBreakdown: Record<number, number>;
        maxDepth: number;
    };

    earnings: {
        totalEarned: number;
        referralBonuses: number; // L1
        levelBonuses: number; // L2+
    };
}

export interface NetworkCalculationOptions {
    dateFrom?: Date;
    dateTo?: Date;
    includeInactive?: boolean; // влияет на ранги (считать всех директов активными)
    maxDepth?: number; // по умолчанию 16
    minPVForActive?: number; // по умолчанию 1 (любой PV за период → активен)
    matrixWidth?: number; // для аналитики матрицы/спилловера, например 3
}

/* =========================
   Константы рангов (пример)
   ========================= */

const RANK_RULES: Array<{
    level: number;
    minActiveDirects: number;
    minPersonalPV: number;
    minGroupPV: number;
}> = [
        { level: 0, minActiveDirects: 0, minPersonalPV: 0, minGroupPV: 0 },
        { level: 1, minActiveDirects: 1, minPersonalPV: 50, minGroupPV: 1000 },
        { level: 2, minActiveDirects: 3, minPersonalPV: 100, minGroupPV: 5000 },
        { level: 3, minActiveDirects: 5, minPersonalPV: 200, minGroupPV: 15000 },
    ];

type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];

/* =========================
   Сервис
   ========================= */

export class MLMNetworkService {
    /**
     * Полная статистика по одному пользователю
     */
    async getUserNetworkStats(userId: string, options: NetworkCalculationOptions = {}): Promise<UserNetworkStats> {
        const uRes = await db.select().from(appUser).where(eq(appUser.id, userId)).limit(1);
        const u = uRes[0];
        if (!u) throw new Error('User not found');

        const maxDepth = options.maxDepth ?? 16;

        // Личный объём
        const personalVolume = await this.calculatePersonalVolume(u.id, options);

        // Вся сеть вниз (одним рекурсивным запросом, с защитой от циклов)
        const networkRefs = await this.fetchNetworkViaCTE({ rootUserId: u.id, maxDepth });

        // Список ID для ГО
        const refUserIds = networkRefs.map((r) => r.userId);

        // ГО — агрегаты
        const groupVolume = await this.calculateGroupVolume(refUserIds, options);

        // Активные партнёры (для ранга/матрицы)
        const activeUserIds = await this.getActiveUsersSet([u.id, ...refUserIds], options);

        // Структура сети (счётчики уровней/макс-глубина; без «обрезки» по активности)
        const network = this.calculateNetworkStructure(networkRefs);

        // Доход по леджеру (RUB, счёт type='referral')
        const earnings = await this.calculateUserEarnings(u.id, options);

        // Ранг — считаем по активным метрикам (или всем, если includeInactive=true)
        const directRefs = networkRefs.filter((r) => r.level === 1).map((r) => r.userId);
        const activeDirects = options.includeInactive ? directRefs.length : directRefs.filter((id) => activeUserIds.has(id)).length;
        const level = this.calculateUserMlmLevel({
            personalPV: personalVolume.totalPV,
            groupPV: groupVolume.totalPV,
            activeDirects,
        });

        return {
            userId: u.id,
            firstName: u.firstName ?? null,
            username: u.username ?? null,
            telegramId: String(u.telegramId),
            referralCode: String(u.referralCode),
            currentLevel: level,
            personalVolume,
            groupVolume,
            network,
            earnings,
        };
    }

    /**
     * Сводка для всех пользователей (батчами)
     */
    async getAllUsersNetworkStats(options: NetworkCalculationOptions = {}): Promise<UserNetworkStats[]> {
        const all = await db.select({ id: appUser.id }).from(appUser);
        const batchSize = 20;
        const out: UserNetworkStats[] = [];

        for (let i = 0; i < all.length; i += batchSize) {
            const batch = all.slice(i, i + batchSize);
            const stats = await Promise.all(batch.map((u) => this.getUserNetworkStats(u.id, options)));
            out.push(...stats);
        }
        return out;
    }

    /* ========== ВСПОМОГАТЕЛЬНЫЕ ==========
       — рекурсивная сеть, активность, PV, earnings, структура, ранги
    ======================================= */

    /**
     * Вся сеть вниз — одним рекурсивным CTE через network_edge.
     * Использует таблицу network_edge (parent_id → child_id) вместо applied_referral_code.
     * Защита от циклов: массив path c проверкой NOT c.id = ANY(path).
     */
    private async fetchNetworkViaCTE(params: {
        rootUserId: string;
        maxDepth: number;
    }): Promise<Array<{ userId: string; telegramId: string; level: number }>> {
        const { rootUserId, maxDepth } = params;

        const res = await db.execute<{
            id: string;
            telegram_id: string;
            lvl: number;
        }>(sql`
            WITH RECURSIVE downline (id, telegram_id, lvl, path) AS (
                SELECT u.id, u.telegram_id, 0 AS lvl, ARRAY[u.id]
                FROM ${appUser} AS u
                WHERE u.id = ${rootUserId}

                UNION ALL

                SELECT c.id, c.telegram_id, d.lvl + 1,
                       d.path || c.id
                FROM ${appUser} AS c
                         JOIN network_edge ne ON ne.child_id = c.id
                         JOIN downline d ON d.id = ne.parent_id
                WHERE d.lvl < ${maxDepth}
                  AND NOT (c.id = ANY (d.path))
            )
            SELECT id, telegram_id, lvl
            FROM downline
            WHERE lvl >= 1
            ORDER BY lvl, id;
        `);

        const rows = res.rows ?? [];
        return rows.map((r) => ({
            userId: r.id,
            telegramId: r.telegram_id,
            level: Number(r.lvl ?? 0),
        }));
    }

    /**
     * Активные пользователи за период.
     * По умолчанию: PV >= minPVForActive (или любой delivered заказ).
     */
    private async getActiveUsersSet(candidateUserIds: string[], opts: NetworkCalculationOptions): Promise<Set<string>> {
        if (candidateUserIds.length === 0) return new Set();
        const minPV = opts.minPVForActive ?? 1;

        const conds: any[] = [
            inArray(order.userId, candidateUserIds as [string, ...string[]]),
            eq(order.deliveryStatus, 'delivered' as DeliveryStatus),
        ];
        if (opts.dateFrom) conds.push(gte(order.createdAt, opts.dateFrom));
        if (opts.dateTo) conds.push(lte(order.createdAt, opts.dateTo));

        const rows = await db
            .select({
                userId: order.userId,
                totalPV: sql<number>`COALESCE(SUM(${order.pvEarned}), 0)`,
                ordersCount: sql<number>`COUNT(*)`,
            })
            .from(order)
            .where(and(...conds))
            .groupBy(order.userId);

        const active = new Set<string>();
        for (const r of rows) {
            const pv = Number(r?.totalPV ?? 0);
            const cnt = Number(r?.ordersCount ?? 0);
            if (pv >= minPV || cnt > 0) active.add(r.userId);
        }
        return active;
    }

    /**
     * Личный объём: delivered-заказы пользователя
     */
    private async calculatePersonalVolume(userId: string, opts: NetworkCalculationOptions) {
        let whereExp = and(eq(order.userId, userId), eq(order.deliveryStatus, 'delivered' as DeliveryStatus));
        if (opts.dateFrom) whereExp = and(whereExp, gte(order.createdAt, opts.dateFrom));
        if (opts.dateTo) whereExp = and(whereExp, lte(order.createdAt, opts.dateTo));

        const rows = await db
            .select({
                totalAmount: sql<number>`COALESCE(SUM((${order.orderBaseRub})::decimal), 0)`,
                totalPV: sql<number>`COALESCE(SUM(${order.pvEarned}), 0)`,
                ordersCount: sql<number>`COUNT(*)`,
            })
            .from(order)
            .where(whereExp);

        const row = rows[0];
        return {
            totalAmount: Number(row?.totalAmount ?? 0),
            totalPV: Number(row?.totalPV ?? 0),
            ordersCount: Number(row?.ordersCount ?? 0),
        };
    }

    /**
     * ГО: delivered-заказы рефералов
     */
    private async calculateGroupVolume(refUserIds: string[], opts: NetworkCalculationOptions) {
        if (refUserIds.length === 0) {
            return { totalAmount: 0, totalPV: 0, ordersCount: 0 };
        }

        let whereExp = and(inArray(order.userId, refUserIds), eq(order.deliveryStatus, 'delivered' as DeliveryStatus));
        if (opts.dateFrom) whereExp = and(whereExp, gte(order.createdAt, opts.dateFrom));
        if (opts.dateTo) whereExp = and(whereExp, lte(order.createdAt, opts.dateTo));

        const rows = await db
            .select({
                totalAmount: sql<number>`COALESCE(SUM((${order.orderBaseRub})::decimal), 0)`,
                totalPV: sql<number>`COALESCE(SUM(${order.pvEarned}), 0)`,
                ordersCount: sql<number>`COUNT(*)`,
            })
            .from(order)
            .where(whereExp);

        const row = rows[0];
        return {
            totalAmount: Number(row?.totalAmount ?? 0),
            totalPV: Number(row?.totalPV ?? 0),
            ordersCount: Number(row?.ordersCount ?? 0),
        };
    }

    /**
     * Разбивка по уровням 1..16
     */
    private calculateNetworkStructure(refs: Array<{ level: number }>) {
        const levelBreakdown: Record<number, number> = {};
        for (let i = 1; i <= 16; i++) levelBreakdown[i] = 0;

        let maxDepth = 0;
        for (const r of refs) {
            const lvl = r?.level ?? 0;
            if (lvl >= 1 && lvl <= 16) {
                levelBreakdown[lvl] = (levelBreakdown[lvl] ?? 0) + 1;
                if (lvl > maxDepth) maxDepth = lvl;
            }
        }

        return {
            totalReferrals: refs.length,
            directReferrals: levelBreakdown[1] ?? 0,
            levelBreakdown,
            maxDepth,
        };
    }

    /**
     * Доход из леджера: сумма всех кредитов на referral-счёт (RUB).
     * L1/L2+ выделяем по шаблону в memo на уровне SQL.
     */
    private async calculateUserEarnings(userId: string, _opts: NetworkCalculationOptions) {
        const refAcc = await db.query.ledgerAccount.findFirst({
            where: and(
                eq(ledgerAccount.ownerType, 'user'),
                eq(ledgerAccount.ownerId, userId),
                eq(ledgerAccount.type, 'referral'),
                eq(ledgerAccount.currency, 'RUB'),
            ),
        });

        if (!refAcc) {
            return { totalEarned: 0, referralBonuses: 0, levelBonuses: 0, fastStartBonus: 0, infinityBonus: 0, option3Bonus: 0 };
        }

        const [row] = await db
            .select({
                total: sql<number>`COALESCE(SUM((${ledgerPosting.amount})::decimal), 0)`,
                l1: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerPosting.memo} ~ '\\mL1\\M' THEN (${ledgerPosting.amount})::decimal ELSE 0 END), 0)`,
                l2p: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerPosting.memo} ~ '\\mL(2|3)\\M' THEN (${ledgerPosting.amount})::decimal ELSE 0 END), 0)`,
                fastStart: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerTxn.opType} = 'fast_start' THEN (${ledgerPosting.amount})::decimal ELSE 0 END), 0)`,
                infinity: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerTxn.opType} = 'infinity' THEN (${ledgerPosting.amount})::decimal ELSE 0 END), 0)`,
                option3: sql<number>`COALESCE(SUM(CASE WHEN ${ledgerTxn.opType} = 'option_bonus' THEN (${ledgerPosting.amount})::decimal ELSE 0 END), 0)`,
            })
            .from(ledgerPosting)
            .innerJoin(ledgerTxn, eq(ledgerPosting.txnId, ledgerTxn.id))
            .where(eq(ledgerPosting.creditAccountId, refAcc.id));

        const round2 = (n: number) => Math.round(n * 100) / 100;
        return {
            totalEarned: round2(Number(row?.total ?? 0)),
            referralBonuses: round2(Number(row?.l1 ?? 0)),
            levelBonuses: round2(Number(row?.l2p ?? 0)),
            fastStartBonus: round2(Number(row?.fastStart ?? 0)),
            infinityBonus: round2(Number(row?.infinity ?? 0)),
            option3Bonus: round2(Number(row?.option3 ?? 0)),
        };
    }

    /**
     * Ранг по простому правилу: активные директы + личный PV + групповой PV.
     */
    private calculateUserMlmLevel(args: { personalPV: number; groupPV: number; activeDirects: number }): number {
        const { personalPV, groupPV, activeDirects } = args;
        let level = 0;
        for (const rule of RANK_RULES) {
            if (activeDirects >= rule.minActiveDirects && personalPV >= rule.minPersonalPV && groupPV >= rule.minGroupPV) {
                level = Math.max(level, rule.level);
            }
        }
        return level;
    }

    /* =========================
       Матрица / Спилловер (аналитика)
       ========================= */

    async getUserMatrixView(
        userId: string,
        options: NetworkCalculationOptions = {},
    ): Promise<{
        width: number;
        direct: { total: number; overflow: number };
        levels: Array<{ level: number; seats: number; placed: number }>;
    }> {
        const width = Math.max(1, options.matrixWidth ?? 3);
        const networkRefs = await this.fetchNetworkViaCTE({ rootUserId: userId, maxDepth: options.maxDepth ?? 16 });

        // Всего директов (факт)
        const directIds = networkRefs.filter((r) => r.level === 1).map((r) => r.userId);
        const directTotal = directIds.length;
        const overflow = Math.max(0, directTotal - width);

        // Симуляция размещения в идеальной матрице ширины width
        const maxLevel = Math.max(0, ...networkRefs.map((r) => r.level), 0);
        const levels: Array<{ level: number; seats: number; placed: number }> = [];
        let remaining = networkRefs.length;

        for (let lvl = 1; lvl <= maxLevel; lvl++) {
            const seats = Math.pow(width, lvl);
            const placed = Math.min(seats, remaining);
            levels.push({ level: lvl, seats, placed });
            remaining -= placed;
            if (remaining <= 0) break;
        }

        return {
            width,
            direct: { total: directTotal, overflow },
            levels,
        };
    }
}

export const mlmNetworkService = new MLMNetworkService();
