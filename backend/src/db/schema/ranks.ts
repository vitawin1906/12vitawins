// backend/drizzle/schema/ranks.ts
import {
    pgTable, integer, numeric, boolean, text, check, index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { mlmRankEnum } from './enums';

/**
 * Конфигурация требований к рангам.
 * PK = mlm_rank (enum): 'member' | 'лидер' | 'создатель'
 * User хранит текущий ранг как enum в app_user.rank.
 */
export const rankRules = pgTable('rank_rules', {
    // первичный ключ — код ранга из enum
    rank: mlmRankEnum('rank').primaryKey(),

    // опциональная человекочитаемая метка
    name: text('name'),

    // Пороговые значения/настройки
    requiredPv:            numeric('required_pv',         { precision: 12, scale: 2 }),
    requiredTurnover:      numeric('required_turnover',   { precision: 12, scale: 2 }),
    bonusPercent:          numeric('bonus_percent',       { precision: 5,  scale: 2 }),
    requiredLo:            numeric('required_lo',         { precision: 12, scale: 2 }),
    requiredActivePartners: integer('required_active_partners'),
    requiredBranches:       integer('required_branches'),
    holdMonths:             integer('hold_months'),
    isCreator:              boolean('is_creator').notNull().default(false),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    // Базовые инварианты целостности
    chkBonusPercentRange: check(
        'chk_rank_rules_bonus_percent_range',
        sql`${t.bonusPercent} IS NULL OR (${t.bonusPercent} >= 0 AND ${t.bonusPercent} <= 100)`
    ),
    chkNonNegativeNums: check(
        'chk_rank_rules_non_negative_nums',
        sql`COALESCE(${t.requiredPv}, 0) >= 0
        AND COALESCE(${t.requiredTurnover}, 0) >= 0
        AND COALESCE(${t.requiredLo}, 0) >= 0`
    ),
    chkNonNegativeInts: check(
        'chk_rank_rules_non_negative_ints',
        sql`COALESCE(${t.requiredActivePartners}, 0) >= 0
        AND COALESCE(${t.requiredBranches}, 0) >= 0
        AND COALESCE(${t.holdMonths}, 0) >= 0`
    ),
    // Нужен ли индекс по is_creator — зависит от админских выборок; оставим лёгкий индекс
    ixIsCreator: index('ix_rank_rules_is_creator').on(t.isCreator),
}));

export type RankRule = typeof rankRules.$inferSelect;
export type NewRankRule = typeof rankRules.$inferInsert;
