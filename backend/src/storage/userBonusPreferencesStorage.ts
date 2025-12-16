// backend/src/storage/userBonusPreferencesStorage.ts
import { db } from '#db/db';
import { userBonusPreferences, type UserBonusPreferences, type NewUserBonusPreferences } from '#db/schema/userBonusPreferences';
import { appUser } from '#db/schema/users';
import { eq } from 'drizzle-orm';

/**
 * Storage layer for user bonus preferences
 * Handles CRUD operations for bonus distribution preferences
 */
export const userBonusPreferencesStorage = {
    /**
     * Get user bonus preferences by userId
     * Returns null if not found
     */
    async getByUserId(userId: string): Promise<UserBonusPreferences | null> {
        const [row] = await db
            .select()
            .from(userBonusPreferences)
            .where(eq(userBonusPreferences.userId, userId))
            .limit(1);

        return row ?? null;
    },

    /**
     * Create default bonus preferences for user
     * Default: 25% health, 25% travel, 25% home, 25% auto
     */
    async createDefault(userId: string): Promise<UserBonusPreferences> {
        const [created] = await db
            .insert(userBonusPreferences)
            .values({
                userId,
                healthPercent: 25,
                travelPercent: 25,
                homePercent: 25,
                autoPercent: 25,
                isLocked: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (!created) throw new Error('Failed to create default bonus preferences');
        return created;
    },

    /**
     * Create custom bonus preferences
     */
    async create(data: NewUserBonusPreferences): Promise<UserBonusPreferences> {
        const [created] = await db
            .insert(userBonusPreferences)
            .values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        if (!created) throw new Error('Failed to create bonus preferences');
        return created;
    },

    /**
     * Update user bonus preferences
     */
    async update(
        userId: string,
        patch: Partial<Pick<UserBonusPreferences, 'healthPercent' | 'travelPercent' | 'homePercent' | 'autoPercent'>>
    ): Promise<UserBonusPreferences | null> {
        const [updated] = await db
            .update(userBonusPreferences)
            .set({
                ...patch,
                updatedAt: new Date(),
            })
            .where(eq(userBonusPreferences.userId, userId))
            .returning();

        return updated ?? null;
    },

    /**
     * Lock or unlock user preferences (admin only)
     */
    async setLocked(userId: string, isLocked: boolean): Promise<UserBonusPreferences | null> {
        const [updated] = await db
            .update(userBonusPreferences)
            .set({
                isLocked,
                updatedAt: new Date(),
            })
            .where(eq(userBonusPreferences.userId, userId))
            .returning();

        return updated ?? null;
    },

    /**
     * Get all users bonus preferences with user info (admin)
     */
    async listAllWithUsers(): Promise<
        Array<UserBonusPreferences & {
            firstName: string | null;
            username: string | null;
            telegramId: string | null; // ← исправили bigint → string | null
        }>
    > {
        const rows = await db
            .select({
                id: userBonusPreferences.userId,
                userId: userBonusPreferences.userId,
                healthPercent: userBonusPreferences.healthPercent,
                travelPercent: userBonusPreferences.travelPercent,
                homePercent: userBonusPreferences.homePercent,
                autoPercent: userBonusPreferences.autoPercent,
                isLocked: userBonusPreferences.isLocked,
                createdAt: userBonusPreferences.createdAt,
                updatedAt: userBonusPreferences.updatedAt,
                firstName: appUser.firstName,
                username: appUser.username,
                telegramId: appUser.telegramId,
            })
            .from(userBonusPreferences)
            .leftJoin(appUser, eq(appUser.id, userBonusPreferences.userId));

        return rows;
    },

    /**
     * Delete user bonus preferences
     */
    async delete(userId: string): Promise<boolean> {
        const result = await db
            .delete(userBonusPreferences)
            .where(eq(userBonusPreferences.userId, userId));

        return (result.rowCount ?? 0) > 0;
    },
};

export type { UserBonusPreferences, NewUserBonusPreferences };
