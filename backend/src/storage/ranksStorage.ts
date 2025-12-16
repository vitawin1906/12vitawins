// src/storage/ranksStorage.ts
import { db } from '#db/db';
import { eq, sql } from 'drizzle-orm';
import {
    rankRules,
    type RankRule,
    type NewRankRule,
} from '#db/schema/ranks';

/* ───────── helpers ───────── */
function must<T>(row: T | undefined, msg = 'Row not found'): T {
    if (row === undefined) throw new Error(msg);
    return row;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out as Partial<T>;
}

type NumLike = number | string | null | undefined;
function toPgNum(v: NumLike): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    return typeof v === 'number' ? v.toFixed(2) : v;
}

/* ───────── types & normalization ───────── */
export type RankRuleInput = {
    name?: string;
    requiredPv?: NumLike;
    requiredTurnover?: NumLike;
    bonusPercent?: NumLike;
    requiredLo?: NumLike;
    requiredActivePartners?: number | null;
    requiredBranches?: number | null;
    holdMonths?: number | null;
    isCreator?: boolean | null;
};

function normalize(input: RankRuleInput) {
    return stripUndefined({
        name: input.name,
        requiredPv: toPgNum(input.requiredPv),
        requiredTurnover: toPgNum(input.requiredTurnover),
        bonusPercent: toPgNum(input.bonusPercent),
        requiredLo: toPgNum(input.requiredLo),
        requiredActivePartners: input.requiredActivePartners ?? undefined,
        requiredBranches: input.requiredBranches ?? undefined,
        holdMonths: input.holdMonths ?? undefined,
        isCreator: input.isCreator ?? undefined,
        updatedAt: new Date(),
    }) as Partial<NewRankRule>;
}

/* ───────── storage object ───────── */
export const ranksStorage = {
    async createRank(rank: string, input: RankRuleInput): Promise<RankRule> {
        const base = normalize(input);
        const payload: NewRankRule = { rank, ...base } as NewRankRule;
        const [row] = await db.insert(rankRules).values(payload).returning();
        return must(row, 'Failed to create rank rule');
    },

    async updateRank(rank: string, patch: RankRuleInput): Promise<RankRule> {
        const data = normalize(patch);
        if (Object.keys(data).length === 0) {
            const existing = await this.getRankByCode(rank);
            return must(existing ?? undefined, 'Rank not found');
        }
        const [row] = await db
            .update(rankRules)
            .set(data)
            .where(eq(rankRules.rank, rank as any))
            .returning();
        return must(row, 'Rank not found');
    },

    async deleteRank(rank: string): Promise<boolean> {
        const res = await db
            .delete(rankRules)
            .where(eq(rankRules.rank, rank as any))
            .returning({ rank: rankRules.rank });
        return res.length > 0;
    },

    async getRankByCode(rank: string): Promise<RankRule | null> {
        const [row] = await db
            .select()
            .from(rankRules)
            .where(eq(rankRules.rank, rank as any))
            .limit(1);
        return row ?? null;
    },

    async listRanks(params: { limit?: number; offset?: number } = {}): Promise<RankRule[]> {
        const { limit = 100, offset = 0 } = params;
        return db
            .select()
            .from(rankRules)
            .orderBy(sql`${rankRules.rank} ASC`)
            .limit(limit)
            .offset(offset);
    },

    /** Убедиться, что существует базовый ранг «создатель» */
    async ensureCreatorRank(): Promise<RankRule> {
        const code = 'создатель'; // значение из enum mlm_rank
        const existing = await this.getRankByCode(code);
        if (existing) return existing;

        const [row] = await db
            .insert(rankRules)
            .values({
                rank: code as any,
                name: 'Создатель',
                requiredPv: '0',
                requiredTurnover: '0',
                bonusPercent: '0',
                requiredLo: '0',
                requiredActivePartners: 0,
                requiredBranches: 0,
                holdMonths: 0,
                isCreator: true,
            } satisfies NewRankRule)
            .returning();

        return must(row, 'Failed to seed "Создатель" rank');
    },
};
