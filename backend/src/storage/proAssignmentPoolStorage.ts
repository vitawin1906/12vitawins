// src/storage/proAssignmentPoolStorage.ts
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '#db/db';
import {
    proAssignmentPool,
    type ProAssignmentPool,
    type NewProAssignmentPool,
} from '#db/schema/proAssignmentPool';
import { appUser } from '#db/schema/users';

/** Нормализуем telegram_id к строке (срезая дробную часть у number). */
function toTelegramString(v: string | number | bigint): string {
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return Math.trunc(v).toString();
    return v.toString();
}

function must<T>(row: T | undefined, msg = 'Row not found'): T {
    if (row === undefined) throw new Error(msg);
    return row;
}

export const proAssignmentPoolStorage = {
    /** Идемпотентно добавить telegram_id в пул. */
    async add(telegramId: string | number | bigint): Promise<ProAssignmentPool> {
        const tid = toTelegramString(telegramId);

        const inserted = await db
            .insert(proAssignmentPool)
            .values({ telegramId: tid } as NewProAssignmentPool)
            .onConflictDoNothing()
            .returning();

        if (inserted.length) return inserted[0]!;

        const [row] = await db
            .select()
            .from(proAssignmentPool)
            .where(eq(proAssignmentPool.telegramId, tid))
            .limit(1);

        if (row) return row;

        const [retry] = await db
            .insert(proAssignmentPool)
            .values({ telegramId: tid } as NewProAssignmentPool)
            .returning();

        return must(retry, 'Insert retry failed');
    },

    /** Удалить telegram_id из пула. */
    async remove(telegramId: string | number | bigint): Promise<boolean> {
        const tid = toTelegramString(telegramId);
        const res = await db
            .delete(proAssignmentPool)
            .where(eq(proAssignmentPool.telegramId, tid))
            .returning({ id: proAssignmentPool.id });
        return res.length > 0;
    },

    /** Проверить наличие telegram_id в пуле. */
    async has(telegramId: string | number | bigint): Promise<boolean> {
        const tid = toTelegramString(telegramId);
        const [row] = await db
            .select({ one: sql<number>`1` })
            .from(proAssignmentPool)
            .where(eq(proAssignmentPool.telegramId, tid))
            .limit(1);
        return !!row;
    },

    /** Список пула. */
    async list(params: { limit?: number; offset?: number } = {}): Promise<ProAssignmentPool[]> {
        const { limit = 100, offset = 0 } = params;
        return db
            .select()
            .from(proAssignmentPool)
            .orderBy(desc(proAssignmentPool.id))
            .limit(limit)
            .offset(offset);
    },

    /** Кол-во записей в пуле. */
    async count(): Promise<number> {
        const [row] = await db.select({ cnt: sql<number>`count(*)` }).from(proAssignmentPool);
        return Number(row?.cnt ?? 0);
    },

    /**
     * Случайный активный PRO-партнёр из пула.
     * mlm_status: 'customer' | 'partner' | 'partner_pro'
     */
    async pickRandomPro(): Promise<{ userId: string; telegramId: string } | null> {
        const rows = await db
            .select({
                userId: appUser.id,
                telegramId: appUser.telegramId,
            })
            .from(appUser)
            .innerJoin(
                proAssignmentPool,
                eq(appUser.telegramId, proAssignmentPool.telegramId),
            )
            .where(and(eq(appUser.isActive, true), eq(appUser.mlmStatus, 'partner_pro')))
            .orderBy(sql`random()`)
            .limit(1);

        const row = rows[0];
        if (!row?.telegramId) return null;
        return { userId: row.userId, telegramId: row.telegramId };
    },

    /** Случайный telegram_id из пула (без проверки статуса пользователя). */
    async pickRandomTelegram(): Promise<string | null> {
        const rows = await db
            .select({ telegramId: proAssignmentPool.telegramId })
            .from(proAssignmentPool)
            .orderBy(sql`random()`)
            .limit(1);
        return rows[0]?.telegramId ?? null;
    },
};

export type { ProAssignmentPool } from '#db/schema/proAssignmentPool';
