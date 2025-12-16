import { pgTable, uuid, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { appUser } from './users';

export const userBonusPreferences = pgTable('user_bonus_preferences', {
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    healthPercent: integer('health_percent').notNull().default(25),
    travelPercent: integer('travel_percent').notNull().default(25),
    homePercent: integer('home_percent').notNull().default(25),
    autoPercent: integer('auto_percent').notNull().default(25),
    isLocked: boolean('is_locked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId] }),
}));

export type UserBonusPreferences = typeof userBonusPreferences.$inferSelect;
export type NewUserBonusPreferences = typeof userBonusPreferences.$inferInsert;
