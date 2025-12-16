import { db } from '#db/db';
import {
    eq, and, desc, asc, ilike, or
} from 'drizzle-orm';
import { z } from 'zod';

import { appUser, type AppUser, type NewAppUser } from '#db/schema/users';
import { mlmStatusEnum, mlmRankEnum } from '#db/schema/enums';

/* ----------------------------------------
   Zod Schemas
---------------------------------------- */
export const zUserCreate = z.object({
    telegramId: z.string().min(1).nullable().optional(),
    googleId: z.string().min(1).nullable().optional(),

    username: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    passwordHash: z.string().nullable().optional(),
    googleAvatar: z.string().nullable().optional(),

    referralCode: z.string().min(1),
    referrerId: z.string().uuid().nullable(),

    mlmStatus: z.enum(mlmStatusEnum.enumValues).default('customer'),
    rank: z.enum(mlmRankEnum.enumValues).default('member'),

    referrerLocked: z.boolean().optional(),
    isActive: z.boolean().optional(),

    activatedAt: z.date().nullable().optional(),
    upgradeDeadlineAt: z.date().nullable().optional(),
    lastLogin: z.date().nullable().optional(),
    canReceiveFirstlineBonus: z.boolean().optional(),

    /* ---------- ВАЖНАЯ ПРАВКА ---------- */
    freedomShares: z
        .tuple([
            z.number(),
            z.number(),
            z.number(),
            z.number()
        ])
        .optional(),

    option3Enabled: z.boolean().optional(),

    deletedAt: z.date().nullable().optional(),
});

export const zUserUpdate = z.object({
    telegramId: z.string().nullable().optional(),
    googleId: z.string().nullable().optional(),

    username: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    passwordHash: z.string().nullable().optional(),
    googleAvatar: z.string().nullable().optional(),

    referralCode: z.string().optional(),
    referrerId: z.string().uuid().nullable().optional(),

    mlmStatus: z.enum(mlmStatusEnum.enumValues).optional(),
    rank: z.enum(mlmRankEnum.enumValues).optional(),

    referrerLocked: z.boolean().optional(),
    isActive: z.boolean().optional(),

    activatedAt: z.date().nullable().optional(),
    upgradeDeadlineAt: z.date().nullable().optional(),
    lastLogin: z.date().nullable().optional(),
    canReceiveFirstlineBonus: z.boolean().optional(),

    /* 🔥 tuple обязательно, иначе Drizzle ругается */
    freedomShares: z
        .tuple([
            z.number(),
            z.number(),
            z.number(),
            z.number(),
        ])
        .optional(),

    option3Enabled: z.boolean().optional(),
    deletedAt: z.date().nullable().optional(),
});

/* ----------------------------------------
   CREATE USER
---------------------------------------- */

async function createUser(input: z.input<typeof zUserCreate>): Promise<AppUser> {
    const data = zUserCreate.parse(input);

    const toInsert: NewAppUser = {
        telegramId: data.telegramId ?? null,
        googleId: data.googleId ?? null,

        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        passwordHash: data.passwordHash ?? null,
        googleAvatar: data.googleAvatar ?? null,

        referralCode: data.referralCode,
        referrerId: data.referrerId ?? null,

        mlmStatus: data.mlmStatus,
        rank: data.rank,

        referrerLocked: data.referrerLocked ?? false,
        isActive: data.isActive ?? true,

        activatedAt: data.activatedAt ?? null,
        upgradeDeadlineAt: data.upgradeDeadlineAt ?? null,
        lastLogin: data.lastLogin ?? null,
        canReceiveFirstlineBonus: data.canReceiveFirstlineBonus ?? false,

        /* ---------- tuple совместимый с SQL ---------- */
        freedomShares: (data.freedomShares ?? [25, 25, 25, 25]) as [number, number, number, number],

        option3Enabled: data.option3Enabled ?? false,
        deletedAt: data.deletedAt ?? null,

        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        const inserted = await db.insert(appUser).values(toInsert).returning();
        const row = (inserted as any)[0] as AppUser | undefined;
        return row!;
    } catch (e: any) {
        if (e?.code === '23505' && /referral_code/i.test(e.detail || '')) {
            const inserted2 = await db.insert(appUser)
                .values({
                    ...toInsert,
                    referralCode: `${toInsert.referralCode}-${Date.now().toString(36)}`
                })
                .returning();

            const row2 = (inserted2 as any)[0] as AppUser | undefined;
            return row2!;
        }
        throw e;
    }
}

/* ----------------------------------------
   GETTERS
---------------------------------------- */

async function getUserById(id: string): Promise<AppUser | null> {
    const [row] = await db.select().from(appUser)
        .where(eq(appUser.id, id)).limit(1);
    return row ?? null;
}

async function getUserByTelegramId(telegramId: string): Promise<AppUser | null> {
    const [row] = await db.select().from(appUser)
        .where(eq(appUser.telegramId, telegramId)).limit(1);
    return row ?? null;
}

async function getUserByEmail(email: string): Promise<AppUser | null> {
    const [row] = await db.select().from(appUser)
        .where(eq(appUser.email, email)).limit(1);
    return row ?? null;
}

async function getUserByGoogleId(googleId: string): Promise<AppUser | null> {
    const [row] = await db.select().from(appUser)
        .where(eq(appUser.googleId, googleId)).limit(1);
    return row ?? null;
}

async function getUserByReferralCode(code: string): Promise<AppUser | null> {
    const [row] = await db.select().from(appUser)
        .where(eq(appUser.referralCode, code)).limit(1);
    return row ?? null;
}

/**
 * ✅ Registry v0.4.1: Get user by phone (for idempotency)
 */
async function getUserByPhone(phone: string): Promise<AppUser | null> {
    const [row] = await db.select().from(appUser)
        .where(eq(appUser.phone, phone)).limit(1);
    return row ?? null;
}

/* ----------------------------------------
   LIST USERS
---------------------------------------- */

async function listUsers(params: {
    q?: string;
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
} = {}): Promise<AppUser[]> {
    const {
        q,
        limit = 50,
        offset = 0,
        activeOnly = false,
        orderBy = 'createdAt',
        orderDir = 'desc',
    } = params;

    const search = q?.trim()
        ? or(
            ilike(appUser.firstName, `%${q}%`),
            ilike(appUser.lastName, `%${q}%`),
            ilike(appUser.username, `%${q}%`),
            ilike(appUser.email, `%${q}%`)
        )
        : undefined;

    const where = activeOnly
        ? (search ? and(eq(appUser.isActive, true), search) : eq(appUser.isActive, true))
        : search;

    const col = (appUser as any)[orderBy] ?? appUser.createdAt;
    const orderExpr = orderDir === 'asc' ? asc(col) : desc(col);

    return await db.select()
        .from(appUser)
        .where(where)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset);
}

/* ----------------------------------------
   UPDATE USER
---------------------------------------- */

async function updateUser(id: string, input: z.infer<typeof zUserUpdate>): Promise<AppUser | null> {
    const data = zUserUpdate.parse(input);
    if (data.canReceiveFirstlineBonus !== undefined) {
        data.canReceiveFirstlineBonus = data.canReceiveFirstlineBonus;
    }

    // Cast freedomShares to tuple if present
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.freedomShares) {
        updateData.freedomShares = data.freedomShares as [number, number, number, number];
    }

    const [row] = await db.update(appUser)
        .set(updateData)
        .where(eq(appUser.id, id))
        .returning();

    return row ?? null;
}

/* ----------------------------------------
   OTHER HELPERS
---------------------------------------- */

async function updateLastLogin(userId: string) {
    await db.update(appUser)
        .set({ lastLogin: new Date(), updatedAt: new Date() })
        .where(eq(appUser.id, userId));
}

async function listActivePartners(): Promise<AppUser[]> {
    return db
        .select()
        .from(appUser)
        .where(
            and(
                eq(appUser.isActive, true),
                or(
                    eq(appUser.mlmStatus, 'partner'),
                    eq(appUser.mlmStatus, 'partner_pro')
                )
            )
        );
}

async function deleteUser(id: string): Promise<boolean> {
    const [row] = await db.update(appUser)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(appUser.id, id))
        .returning();

    return !!row;
}

/* ----------------------------------------
   EXPORT
---------------------------------------- */

export const usersStorage = {
    createUser,
    getUserById,
    getUserByTelegramId,
    getUserByEmail,
    getUserByPhone,
    getUserByGoogleId,
    getUserByReferralCode,
    listUsers,
    updateUser,
    deleteUser,
    updateLastLogin,
    listActivePartners,
};
