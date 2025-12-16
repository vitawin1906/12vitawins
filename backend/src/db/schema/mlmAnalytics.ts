// backend/drizzle/schema/mlmAnalytics.ts
import {
    pgTable, uuid, text, numeric, boolean, timestamp, integer,
    uniqueIndex, index, check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import {appUser} from "#db/schema/users";
import {mlmRankEnum} from "#db/schema/enums";


/**
 * Ежемесячная статистика по пользователю (ГО/ЛО, ранги)
 */
export const mlmMonthlyStats = pgTable('mlm_monthly_stats', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    month: text('month').notNull(), // 'YYYY-MM-01'

    goAmount: numeric('go_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    loAmount: numeric('lo_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    rank: mlmRankEnum('rank').notNull().default('member'),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    uxUserMonth: uniqueIndex('ux_mlm_monthly_stats_user_month').on(t.userId, t.month),
    ixMonth: index('ix_mlm_monthly_stats_month').on(t.month),
}));

export type MlmMonthlyStat = typeof mlmMonthlyStats.$inferSelect;
export type NewMlmMonthlyStat = typeof mlmMonthlyStats.$inferInsert;

/**
 * Распределение процентов по уровням (активная матрица)
 */
export const matrixDistribution = pgTable('matrix_distribution', {
    level: integer('level').primaryKey(),
    percent: numeric('percent', { precision: 6, scale: 4 }).notNull(), // 0..1
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    chkLevelRange: check('chk_matrix_level_range', sql`${t.level} BETWEEN 1 AND 15`),
    chkPercentRange: check('chk_matrix_percent_range', sql`${t.percent} BETWEEN 0 AND 1`),
}));

export type MatrixDistribution = typeof matrixDistribution.$inferSelect;

/**
 * Настройки лидеров (доп. проценты и флаги)
 */
export const leaderOptions = pgTable('leader_options', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    extraPercent: numeric('extra_percent', { precision: 5, scale: 2 }),
    enabled: boolean('enabled').notNull().default(false),
    enabledFrom: timestamp('enabled_from', { withTimezone: true }),
    note: text('note'),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    uxUser: uniqueIndex('ux_leader_options_user').on(t.userId),

    chkExtraPercentRange: check(
        'chk_leader_extra_percent_range',
        sql`${t.extraPercent} IS NULL OR (${t.extraPercent} >= 0 AND ${t.extraPercent} <= 100)`
    ),
}));


export type LeaderOption = typeof leaderOptions.$inferSelect;
export type NewLeaderOption = typeof leaderOptions.$inferInsert;

/**
 * Цели лидеров по веткам
 */
export const leaderTargets = pgTable('leader_targets', {
    id: uuid('id').primaryKey().defaultRandom(),
    leaderUserId: uuid('leader_user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    branchRootUserId: uuid('branch_root_user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    periodMonth: text('period_month').notNull(),
    targetTurnover: numeric('target_turnover', { precision: 14, scale: 2 }).notNull(),
    actualTurnover: numeric('actual_turnover', { precision: 14, scale: 2 }).notNull().default('0'),
    closed: boolean('closed').notNull().default(false),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    uxKey: uniqueIndex('ux_leader_target_key').on(t.leaderUserId, t.periodMonth, t.branchRootUserId),
}));

export type LeaderTarget = typeof leaderTargets.$inferSelect;
export type NewLeaderTarget = typeof leaderTargets.$inferInsert;

/**
 * Правила "Пула первых"
 */
export const poolFirstRules = pgTable('pool_first_rules', {
    id: uuid('id').primaryKey().defaultRandom(),
    thresholdTurnover: numeric('threshold_turnover', { precision: 14, scale: 2 }).notNull(),
    payoutAmount: numeric('payout_amount', { precision: 14, scale: 2 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    ixActive: index('ix_pool_first_rules_active').on(t.isActive),
}));

export type PoolFirstRule = typeof poolFirstRules.$inferSelect;
export type NewPoolFirstRule = typeof poolFirstRules.$inferInsert;

/**
 * Начисления "Пула первых"
 */
export const poolFirstAwards = pgTable('pool_first_awards', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    periodMonth: text('period_month').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).defaultNow(),
    createdAt: createdAtCol(),
}, (t) => ({
    ixUser: index('ix_pool_first_awards_user').on(t.userId),
    ixMonth: index('ix_pool_first_awards_month').on(t.periodMonth),
}));

export type PoolFirstAward = typeof poolFirstAwards.$inferSelect;
export type NewPoolFirstAward = typeof poolFirstAwards.$inferInsert;
