// src/storage/mlmAnalyticsStorage.ts
import { db } from '#db/db';
import {
    mlmMonthlyStats,
    matrixDistribution,
    leaderOptions,
    leaderTargets,
    poolFirstRules,
    poolFirstAwards,
    type MlmMonthlyStat,
    type MatrixDistribution,
    type LeaderOption,
    type LeaderTarget,
    type PoolFirstRule,
    type PoolFirstAward,
} from '#db/schema/mlmAnalytics';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';

/** YYYY-MM-01 в UTC */
function monthKey(input?: Date | string): string {
    const d = input ? new Date(input) : new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}

/* ─────────────────────────────────────────────
   A) mlm_monthly_stats
─────────────────────────────────────────────── */

export async function getMonthlyStat(
    userId: string,
    month?: Date | string,
): Promise<MlmMonthlyStat | null> {
    const mk = monthKey(month);
    const [row] = await db
        .select()
        .from(mlmMonthlyStats)
        .where(and(eq(mlmMonthlyStats.userId, userId), eq(mlmMonthlyStats.month, mk)))
        .limit(1);
    return row ?? null;
}

export async function listMonthlyStats(opts: {
    month?: Date | string;
    minLo?: number;
    minGo?: number;
    rankIn?: ReadonlyArray<'member' | 'лидер' | 'создатель'>;
    limit?: number;
    offset?: number;
} = {}): Promise<MlmMonthlyStat[]> {
    const mk = monthKey(opts.month);
    const conds: any[] = [eq(mlmMonthlyStats.month, mk)];
    if (opts.minLo != null) conds.push(gte(mlmMonthlyStats.loAmount, String(opts.minLo)));
    if (opts.minGo != null) conds.push(gte(mlmMonthlyStats.goAmount, String(opts.minGo)));
    if (opts.rankIn?.length) conds.push(inArray(mlmMonthlyStats.rank, opts.rankIn as any)); // тип enum

    return db
        .select()
        .from(mlmMonthlyStats)
        .where(and(...conds))
        .orderBy(desc(mlmMonthlyStats.goAmount))
        .limit(opts.limit ?? 100)
        .offset(opts.offset ?? 0);
}

/* ─────────────────────────────────────────────
   B) matrix_distribution
─────────────────────────────────────────────── */

export async function listMatrixDistribution(): Promise<MatrixDistribution[]> {
    return db.select().from(matrixDistribution).orderBy(matrixDistribution.level);
}

export async function setMatrixLevelPercent(
    level: number,
    percent: number,
): Promise<MatrixDistribution> {
    // percent приводим к строке для NUMERIC
    const pct = String(percent);
    return db.transaction(async (tx) => {
        const [exists] = await tx
            .select()
            .from(matrixDistribution)
            .where(eq(matrixDistribution.level, level))
            .limit(1);

        if (exists) {
            const [upd] = await tx
                .update(matrixDistribution)
                .set({ percent: pct })
                .where(eq(matrixDistribution.level, level))
                .returning();
            return upd!;
        }

        const [ins] = await tx
            .insert(matrixDistribution)
            .values({ level, percent: pct })
            .returning();
        return ins!;
    });
}

/* ─────────────────────────────────────────────
   C) leader_options
─────────────────────────────────────────────── */

export async function getLeaderOptions(userId: string): Promise<LeaderOption | null> {
    const [row] = await db
        .select()
        .from(leaderOptions)
        .where(eq(leaderOptions.userId, userId))
        .limit(1);
    return row ?? null;
}

export async function upsertLeaderOptions(input: {
    userId: string;
    extraPercent?: number;
    enabled?: boolean;
    enabledFrom?: Date | null;
    note?: string | null;
}): Promise<LeaderOption> {
    return db.transaction(async (tx) => {
        const [ex] = await tx
            .select()
            .from(leaderOptions)
            .where(eq(leaderOptions.userId, input.userId))
            .limit(1);

        if (ex) {
            const [upd] = await tx
                .update(leaderOptions)
                .set({
                    extraPercent:
                        input.extraPercent != null ? String(input.extraPercent) : ex.extraPercent,
                    enabled: input.enabled ?? ex.enabled,
                    enabledFrom: input.enabledFrom ?? ex.enabledFrom,
                    note: input.note ?? ex.note,
                })
                .where(eq(leaderOptions.id, ex.id))
                .returning();
            return upd!;
        }

        const [ins] = await tx
            .insert(leaderOptions)
            .values({
                userId: input.userId,
                extraPercent:
                    input.extraPercent != null ? String(input.extraPercent) : undefined,
                enabled: input.enabled ?? true,
                enabledFrom: input.enabledFrom ?? null,
                note: input.note ?? null,
            })
            .returning();
        return ins!;
    });
}

/* ─────────────────────────────────────────────
   D) leader_targets
─────────────────────────────────────────────── */

export async function upsertLeaderTarget(input: {
    leaderUserId: string;
    periodMonth: Date | string;
    branchRootUserId: string;
    targetTurnover: number;
}): Promise<LeaderTarget> {
    const mk = monthKey(input.periodMonth);
    return db.transaction(async (tx) => {
        const [ex] = await tx
            .select()
            .from(leaderTargets)
            .where(
                and(
                    eq(leaderTargets.leaderUserId, input.leaderUserId),
                    eq(leaderTargets.periodMonth, mk),
                    eq(leaderTargets.branchRootUserId, input.branchRootUserId),
                ),
            )
            .limit(1);

        if (ex) {
            const [upd] = await tx
                .update(leaderTargets)
                .set({ targetTurnover: String(input.targetTurnover) })
                .where(eq(leaderTargets.id, ex.id))
                .returning();
            return upd!;
        }

        const [ins] = await tx
            .insert(leaderTargets)
            .values({
                leaderUserId: input.leaderUserId,
                branchRootUserId: input.branchRootUserId,
                periodMonth: mk,
                targetTurnover: String(input.targetTurnover),
            })
            .returning();
        return ins!;
    });
}

/* ─────────────────────────────────────────────
   E) pool_first_rules & awards
─────────────────────────────────────────────── */

export async function listPoolFirstRules(activeOnly = false): Promise<PoolFirstRule[]> {
    if (activeOnly) {
        return db
            .select()
            .from(poolFirstRules)
            .where(eq(poolFirstRules.isActive, true))
            .orderBy(poolFirstRules.thresholdTurnover);
    }
    return db.select().from(poolFirstRules).orderBy(poolFirstRules.thresholdTurnover);
}

export async function createPoolFirstRule(input: {
    thresholdTurnover: number;
    payoutAmount: number;
    isActive?: boolean;
}): Promise<PoolFirstRule> {
    const [row] = await db
        .insert(poolFirstRules)
        .values({
            thresholdTurnover: String(input.thresholdTurnover),
            payoutAmount: String(input.payoutAmount),
            isActive: input.isActive ?? true,
        })
        .returning();
    return row!;
}

export async function listPoolFirstAwards(
    month?: Date | string,
): Promise<PoolFirstAward[]> {
    const mk = monthKey(month);
    return db
        .select()
        .from(poolFirstAwards)
        .where(eq(poolFirstAwards.periodMonth, mk))
        .orderBy(desc(poolFirstAwards.awardedAt));
}
