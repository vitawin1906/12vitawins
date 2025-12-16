// src/storage/gamificationStorage.ts
import { db } from '#db/db';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import {
    airdropTask,
    airdropUserAction,
    achievement,
    achievementUser,
    type AirdropTask,
    type AirdropUserAction,
    type Achievement,
    type AchievementUser,
    type NewAirdropTask,
    type NewAchievement,
} from '#db/schema/airdrop';

/* ───────────────── helpers ───────────────── */

const toPgMoney = (v: number | string | null | undefined): string | undefined => {
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'string') return v;
    return v.toFixed(2);
};

/* ───────────────── validation ───────────────── */

export const zAirdropTaskCreate = z.object({
    code: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    trigger: z.enum([
        'register',
        'complete_profile',
        'first_order_paid',
        'tg_channel_sub',
        'invite_1_friend',
        'invite_3_friends',
        'invite_10_friends',
    ]),
    rewardVwc: z.coerce.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});

export const zAirdropTaskUpdate = zAirdropTaskCreate.partial();

export const zAchievementCreate = z.object({
    code: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    rewardVwc: z.coerce.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});
export const zAchievementUpdate = zAchievementCreate.partial();

/* ───────────────── storage ───────────────── */

export const gamificationStorage = {
    /* ───── Airdrop Tasks ───── */

    listAirdropTasks(): Promise<AirdropTask[]> {
        return db.select().from(airdropTask).orderBy(desc(airdropTask.createdAt));
    },

    async getAirdropTask(id: string): Promise<AirdropTask | null> {
        const [row] = await db.select().from(airdropTask).where(eq(airdropTask.id, id)).limit(1);
        return row ?? null;
    },

    async getAirdropTaskByCode(code: string): Promise<AirdropTask | null> {
        const [row] = await db.select().from(airdropTask).where(eq(airdropTask.code, code)).limit(1);
        return row ?? null;
    },

    async createAirdropTask(input: z.infer<typeof zAirdropTaskCreate>): Promise<AirdropTask> {
        const data = zAirdropTaskCreate.parse(input);
        const [row] = await db
            .insert(airdropTask)
            .values({
                code: data.code,
                title: data.title,
                description: data.description ?? null,
                trigger: data.trigger,
                rewardVwc: toPgMoney(data.rewardVwc) ?? '0',
                isActive: data.isActive ?? true,
            } satisfies NewAirdropTask)
            .returning();
        return row!;
    },

    async updateAirdropTask(
        id: string,
        input: z.infer<typeof zAirdropTaskUpdate>,
    ): Promise<AirdropTask | null> {
        const data = zAirdropTaskUpdate.parse(input);
        const [row] = await db
            .update(airdropTask)
            .set({
                ...(data.code !== undefined ? { code: data.code } : {}),
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.trigger !== undefined ? { trigger: data.trigger } : {}),
                ...(data.rewardVwc !== undefined ? { rewardVwc: toPgMoney(data.rewardVwc) } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                updatedAt: new Date(),
            })
            .where(eq(airdropTask.id, id))
            .returning();
        return row ?? null;
    },

    async deleteAirdropTask(id: string): Promise<AirdropTask | null> {
        const [row] = await db.delete(airdropTask).where(eq(airdropTask.id, id)).returning();
        return row ?? null;
    },

    /* ───── Airdrop User Actions ───── */

    listUserAirdropActions(userId: string): Promise<AirdropUserAction[]> {
        return db
            .select()
            .from(airdropUserAction)
            .where(eq(airdropUserAction.userId, userId))
            .orderBy(desc(airdropUserAction.createdAt));
    },

    async upsertUserAirdropAction(
        userId: string,
        taskId: string,
        payload?: Record<string, unknown>,
        verified = false,
    ): Promise<AirdropUserAction> {
        const [existing] = await db
            .select()
            .from(airdropUserAction)
            .where(and(eq(airdropUserAction.userId, userId), eq(airdropUserAction.taskId, taskId)))
            .limit(1);

        if (existing) {
            const [upd] = await db
                .update(airdropUserAction)
                .set({
                    payload: payload ?? existing.payload,
                    verified,
                    verifiedAt: verified ? new Date() : existing.verifiedAt,
                    updatedAt: new Date(),
                })
                .where(eq(airdropUserAction.id, existing.id))
                .returning();
            return upd!;
        }

        const [ins] = await db
            .insert(airdropUserAction)
            .values({
                userId,
                taskId,
                payload: payload ?? null,
                verified,
                verifiedAt: verified ? new Date() : null,
            })
            .returning();
        return ins!;
    },

    /* ───── Achievements ───── */

    listAchievements(): Promise<Achievement[]> {
        return db.select().from(achievement).orderBy(desc(achievement.createdAt));
    },

    async getAchievement(id: string): Promise<Achievement | null> {
        const [row] = await db.select().from(achievement).where(eq(achievement.id, id)).limit(1);
        return row ?? null;
    },

    async getAchievementByCode(code: string): Promise<Achievement | null> {
        const [row] = await db.select().from(achievement).where(eq(achievement.code, code)).limit(1);
        return row ?? null;
    },

    async createAchievement(input: z.infer<typeof zAchievementCreate>): Promise<Achievement> {
        const data = zAchievementCreate.parse(input);
        const [row] = await db
            .insert(achievement)
            .values({
                code: data.code,
                title: data.title,
                description: data.description ?? null,
                rewardVwc: toPgMoney(data.rewardVwc),
                isActive: data.isActive ?? true,
            } satisfies NewAchievement)
            .returning();
        return row!;
    },

    async updateAchievement(
        id: string,
        input: z.infer<typeof zAchievementUpdate>,
    ): Promise<Achievement | null> {
        const data = zAchievementUpdate.parse(input);
        const [row] = await db
            .update(achievement)
            .set({
                ...(data.code !== undefined ? { code: data.code } : {}),
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.rewardVwc !== undefined ? { rewardVwc: toPgMoney(data.rewardVwc) } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                updatedAt: new Date(),
            })
            .where(eq(achievement.id, id))
            .returning();
        return row ?? null;
    },

    async deleteAchievement(id: string): Promise<Achievement | null> {
        const [row] = await db.delete(achievement).where(eq(achievement.id, id)).returning();
        return row ?? null;
    },

    /* ───── Achievement Users ───── */

    listUserAchievements(userId: string): Promise<AchievementUser[]> {
        return db
            .select()
            .from(achievementUser)
            .where(eq(achievementUser.userId, userId))
            .orderBy(desc(achievementUser.grantedAt));
    },

    async grantAchievement(userId: string, achievementId: string): Promise<AchievementUser> {
        const [existing] = await db
            .select()
            .from(achievementUser)
            .where(and(eq(achievementUser.userId, userId), eq(achievementUser.achievementId, achievementId)))
            .limit(1);
        if (existing) return existing;

        const [ins] = await db
            .insert(achievementUser)
            .values({ userId, achievementId, grantedAt: new Date() })
            .returning();
        return ins!;
    },
};
