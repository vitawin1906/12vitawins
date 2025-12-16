// backend/drizzle/schema/airdrop.ts
import {
    pgTable,
    uuid,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    numeric,
    pgEnum,
    primaryKey,
} from 'drizzle-orm/pg-core';

import { createdAtCol, updatedAtCol } from './_common';
import { appUser } from './users';

// ─────────────────────────────────────────────────────────────
// ENUM: Типы триггеров airdrop задач
// ─────────────────────────────────────────────────────────────

export const airdropTriggerEnum = pgEnum('airdrop_trigger', [
    'register',
    'complete_profile',
    'first_order_paid',
    'tg_channel_sub',
    'invite_1_friend',
    'invite_3_friends',
    'invite_10_friends',
]);

// ─────────────────────────────────────────────────────────────
// Таблица: Airdrop Tasks (список доступных квестов)
// ─────────────────────────────────────────────────────────────

export const airdropTask = pgTable(
    'airdrop_task',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        code: text('code').notNull(),            // уникальный системный код задачи
        title: text('title').notNull(),          // заголовок
        description: text('description'),        // описание задачи

        trigger: airdropTriggerEnum('trigger').notNull(), // ENUM — тип события

        rewardVwc: numeric('reward_vwc', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),

        isActive: boolean('is_active').notNull().default(true),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uxCode: uniqueIndex('ux_airdrop_task_code').on(t.code),
        ixActive: index('ix_airdrop_task_active').on(t.isActive),
    })
);

// ─────────────────────────────────────────────────────────────
// Таблица: Лог выполнения задач пользователем
// (идемпотентность: один task — один раз на user)
// ─────────────────────────────────────────────────────────────

export const airdropUserAction = pgTable(
    'airdrop_user_action',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        taskId: uuid('task_id')
            .notNull()
            .references(() => airdropTask.id, { onDelete: 'cascade' }),

        payload: jsonb('payload'), // доказательства (скрин и пр.)

        verified: boolean('verified').notNull().default(false),
        verifiedAt: timestamp('verified_at', { withTimezone: true }),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uxUserTask: uniqueIndex('ux_airdrop_user_task').on(t.userId, t.taskId),
        ixUser: index('ix_airdrop_action_user').on(t.userId),
        ixTask: index('ix_airdrop_action_task').on(t.taskId),
        ixVerified: index('ix_airdrop_action_verified').on(t.verified),
    })
);

// ─────────────────────────────────────────────────────────────
// Achievement (ачивки/бэйджи)
// ─────────────────────────────────────────────────────────────

export const achievement = pgTable(
    'achievement',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        code: text('code').notNull(), // уникальный код ачивки
        title: text('title').notNull(),
        description: text('description'),

        rewardVwc: numeric('reward_vwc', { precision: 12, scale: 2 }),
        isActive: boolean('is_active').notNull().default(true),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uxCode: uniqueIndex('ux_achievement_code').on(t.code),
        ixActive: index('ix_achievement_active').on(t.isActive),
    })
);

// ─────────────────────────────────────────────────────────────
// Achievement → User (кто какой бэйдж получил)
// ─────────────────────────────────────────────────────────────

export const achievementUser = pgTable(
    'achievement_user',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        achievementId: uuid('achievement_id')
            .notNull()
            .references(() => achievement.id, { onDelete: 'cascade' }),

        grantedAt: timestamp('granted_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => ({
        uxUserAchievement: uniqueIndex('ux_achievement_user').on(
            t.userId,
            t.achievementId
        ),
        ixUser: index('ix_achievement_user_user').on(t.userId),
        ixAchievement: index('ix_achievement_user_ach').on(t.achievementId),
    })
);

// Типы
export type AirdropTask = typeof airdropTask.$inferSelect;
export type NewAirdropTask = typeof airdropTask.$inferInsert;

export type AirdropUserAction = typeof airdropUserAction.$inferSelect;
export type NewAirdropUserAction = typeof airdropUserAction.$inferInsert;

export type Achievement = typeof achievement.$inferSelect;
export type NewAchievement = typeof achievement.$inferInsert;

export type AchievementUser = typeof achievementUser.$inferSelect;
export type NewAchievementUser = typeof achievementUser.$inferInsert;
