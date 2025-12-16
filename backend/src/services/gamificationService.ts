// src/services/gamificationService.ts
import { db } from '#db/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
    airdropTask,
    airdropUserAction,
    achievement,
    achievementUser,
    type AirdropTask,
    type AirdropUserAction, airdropTriggerEnum,
} from '#db/schema/airdrop';
import {
    gamificationStorage,
    zAirdropTaskCreate,
    zAirdropTaskUpdate,
    zAchievementCreate,
    zAchievementUpdate,
} from '#storage/gamificationStorage';

/* ───────── helpers ───────── */

function must<T>(v: T | null | undefined, msg = 'Not found'): asserts v is NonNullable<T> {
    if (v == null) throw new Error(msg);
}
const toNumber = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ───────── types ───────── */

export type AirdropTaskProgress = AirdropTask & {
    userActionId: string | null;
    completed: boolean;
    verified: boolean;
    verifiedAt: Date | null;
    actionCreatedAt: Date | null;
    actionUpdatedAt: Date | null;
    payload: Record<string, unknown> | null;
};

export type TotalsVwc = {
    fromTasks: number;
    fromAchievements: number;
    total: number;
};

/* ───────── service ───────── */

export const gamificationService = {
    // ========== AIRDROP TASKS (CRUD через storage) ==========

    listAirdropTasks() {
        return gamificationStorage.listAirdropTasks();
    },

    getAirdropTask(id: string) {
        return gamificationStorage.getAirdropTask(id);
    },

    getAirdropTaskByCode(code: string) {
        return gamificationStorage.getAirdropTaskByCode(code);
    },

    async createAirdropTask(input: unknown) {
        return gamificationStorage.createAirdropTask(zAirdropTaskCreate.parse(input));
    },

    async updateAirdropTask(id: string, patch: unknown) {
        return gamificationStorage.updateAirdropTask(id, zAirdropTaskUpdate.parse(patch));
    },

    async deleteAirdropTask(id: string) {
        return gamificationStorage.deleteAirdropTask(id);
    },

    // ========== USER ACTIONS / PROGRESS ==========

    /**
     * Список всех задач с прогрессом конкретного пользователя.
     * Можно фильтровать только активные задачи.
     */
    async listUserAirdropProgress(userId: string, opts: { onlyActive?: boolean } = {}): Promise<AirdropTaskProgress[]> {
        const conds: any[] = [];
        if (opts.onlyActive) conds.push(eq(airdropTask.isActive, true));
        const whereExpr = conds.length ? and(...conds) : sql`true`;

        const rows = await db
            .select({
                // task
                id: airdropTask.id,
                code: airdropTask.code,
                title: airdropTask.title,
                description: airdropTask.description,
                trigger: airdropTask.trigger,
                rewardVwc: airdropTask.rewardVwc,
                isActive: airdropTask.isActive,
                createdAt: airdropTask.createdAt,
                updatedAt: airdropTask.updatedAt,
                // user action
                userActionId: airdropUserAction.id,
                payload: airdropUserAction.payload,
                verified: airdropUserAction.verified,
                verifiedAt: airdropUserAction.verifiedAt,
                actionCreatedAt: airdropUserAction.createdAt,
                actionUpdatedAt: airdropUserAction.updatedAt,
            })
            .from(airdropTask)
            .leftJoin(
                airdropUserAction,
                and(eq(airdropUserAction.taskId, airdropTask.id), eq(airdropUserAction.userId, userId)),
            )
            .where(whereExpr)
            .orderBy(desc(airdropTask.createdAt));

        return rows.map((r) => ({
            id: r.id,
            code: r.code,
            title: r.title,
            description: r.description,
            trigger: r.trigger,
            rewardVwc: r.rewardVwc,
            isActive: r.isActive,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            userActionId: r.userActionId ?? null,
            payload: (r.payload as any) ?? null,
            verified: Boolean(r.verified),
            verifiedAt: r.verifiedAt ?? null,
            actionCreatedAt: r.actionCreatedAt ?? null,
            actionUpdatedAt: r.actionUpdatedAt ?? null,
            completed: r.userActionId != null,
        }));
    },

    /**
     * Записать/обновить действие пользователя по коду задачи.
     * verified=false по умолчанию (верификация отдельной операцией).
     */
    async upsertUserActionByTaskCode(userId: string, taskCode: string, payload?: Record<string, unknown>, verified = false) {
        const task = await gamificationStorage.getAirdropTaskByCode(taskCode);
        must(task, 'Airdrop task not found');
        return gamificationStorage.upsertUserAirdropAction(userId, task.id, payload, verified);
    },

    /**
     * Записать действие пользователя по триггеру (airdropTask.trigger).
     */
    async upsertUserActionByTrigger(
        userId: string,
        trigger: (typeof airdropTriggerEnum.enumValues)[number],  // ⭐ фикс
        payload?: Record<string, unknown>,
        verified = false
    ) {
        const [task] = await db
            .select()
            .from(airdropTask)
            .where(eq(airdropTask.trigger, trigger))  // теперь типы совпадают
            .limit(1);

        must(task, 'Airdrop task by trigger not found');
        return gamificationStorage.upsertUserAirdropAction(userId, task.id, payload, verified);
    },


    /** Поставить verified для действия (по коду задачи). */
    async verifyUserActionByTaskCode(userId: string, taskCode: string, payload?: Record<string, unknown>) {
        return this.upsertUserActionByTaskCode(userId, taskCode, payload, true);
    },

    // ========== ACHIEVEMENTS (CRUD через storage) ==========

    listAchievements() {
        return gamificationStorage.listAchievements();
    },

    getAchievement(id: string) {
        return gamificationStorage.getAchievement(id);
    },

    getAchievementByCode(code: string) {
        return gamificationStorage.getAchievementByCode(code);
    },

    async createAchievement(input: unknown) {
        return gamificationStorage.createAchievement(zAchievementCreate.parse(input));
    },

    async updateAchievement(id: string, patch: unknown) {
        return gamificationStorage.updateAchievement(id, zAchievementUpdate.parse(patch));
    },

    async deleteAchievement(id: string) {
        return gamificationStorage.deleteAchievement(id);
    },

    // ========== USER ACHIEVEMENTS ==========

    listUserAchievements(userId: string) {
        return gamificationStorage.listUserAchievements(userId);
    },

    /** Выдать ачивку по её коду (идемпотентно). */
    async grantAchievementByCode(userId: string, achievementCode: string) {
        const ach = await gamificationStorage.getAchievementByCode(achievementCode);
        must(ach, 'Achievement not found');
        return gamificationStorage.grantAchievement(userId, ach.id);
    },

    // ========== TOTALS / SUMMARY ==========

    /** Сводка по VWC: задачи (только verified), ачивки (все выданные). */
    async getUserVwcTotals(userId: string): Promise<TotalsVwc> {
        const taskRows = await db
            .select({ reward: airdropTask.rewardVwc })
            .from(airdropUserAction)
            .innerJoin(airdropTask, eq(airdropTask.id, airdropUserAction.taskId))
            .where(and(eq(airdropUserAction.userId, userId), eq(airdropUserAction.verified, true)));

        const fromTasks = taskRows.reduce((acc, r) => acc + toNumber(r.reward), 0);

        const achRows = await db
            .select({ reward: achievement.rewardVwc })
            .from(achievementUser)
            .innerJoin(achievement, eq(achievement.id, achievementUser.achievementId))
            .where(eq(achievementUser.userId, userId));

        const fromAchievements = achRows.reduce((acc, r) => acc + toNumber(r.reward), 0);

        return { fromTasks, fromAchievements, total: fromTasks + fromAchievements };
    },

    /** Удобный фасад: завершить таск по коду, затем вернуть прогресс и тоталы. */
    async completeTaskAndSummarize(
        userId: string,
        taskCode: string,
        payload?: Record<string, unknown>,
        verified = false,
    ): Promise<{ action: AirdropUserAction; progress: AirdropTaskProgress[]; totals: TotalsVwc }> {
        const action = await this.upsertUserActionByTaskCode(userId, taskCode, payload, verified);
        const progress = await this.listUserAirdropProgress(userId, { onlyActive: false });
        const totals = await this.getUserVwcTotals(userId);
        return { action, progress, totals };
    },
};

export default gamificationService;
