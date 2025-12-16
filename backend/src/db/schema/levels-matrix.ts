// backend/drizzle/schema/levels-matrix.ts
import {
    pgTable, uuid, text, numeric, boolean, timestamp, index, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';

/**
 * Версионирование матриц уровней (основная + Fast Start).
 * Инварианты:
 *  - длина массивов = 15 (CHECK ниже)
 *  - Σ(levels) и Σ(fast_levels) = 0.93 при sum_mode = 'reserve_7pct' — проверяем в сервисе/тестах.
 */
export const levelsMatrixVersions = pgTable('levels_matrix_versions', {
    id: uuid('id').primaryKey().defaultRandom(),

    versionNote: text('version_note'),

    // 'reserve_7pct' (Σ=0.93) или 'full' (Σ=1.00) — режим храним явно
    sumMode: text('sum_mode').notNull().default('reserve_7pct'),

    levels:     numeric('levels', { precision: 6, scale: 4 }).array().notNull(),
    fastLevels: numeric('fast_levels', { precision: 6, scale: 4 }).array().notNull(),

    isActive: boolean('is_active').notNull().default(false),
    activateAt: timestamp('activate_at', { withTimezone: true }),

    activatedByTelegramId: text('activated_by_telegram_id'),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    // Единственная активная версия
    uxActiveOnce: uniqueIndex('ux_lmv_active_once')
        .on(t.isActive)
        .where(sql`${t.isActive} = true`),

    ixActive: index('ix_lmv_active').on(t.isActive),
    ixActivateAt: index('ix_lmv_activate_at').on(t.activateAt),

    // Структурные инварианты (суммы проверяем в коде)
    chkLenLevels: check('chk_lmv_levels_len', sql`array_length(${t.levels}, 1) = 15`),
    chkLenFast:   check('chk_lmv_fast_len',   sql`array_length(${t.fastLevels}, 1) = 15`),
    chkSumMode:   check('chk_lmv_sum_mode',   sql`${t.sumMode} IN ('reserve_7pct','full')`),


}));

export type LevelsMatrixVersion = typeof levelsMatrixVersions.$inferSelect;
export type NewLevelsMatrixVersion = typeof levelsMatrixVersions.$inferInsert;
