// backend/src/db/schema/matrixPlacement.ts
import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    numeric,
    uniqueIndex,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './users';
import { createdAtCol, updatedAtCol } from './_common';

/**
 * Matrix Placement - позиция пользователя в бинарной матрице MLM
 *
 * Бинарная матрица:
 * - У каждого пользователя максимум 2 прямых реферала (left, right)
 * - Структура дерева с позициями 'left' и 'right'
 * - Используется для расчёта бинарных бонусов
 * - Отдельно от referral дерева (network_edge)
 *
 * Отличие от network_edge:
 * - network_edge - реферальное дерево (спонсорство)
 * - matrix_placement - бинарная матрица (placement дерево для бинарных бонусов)
 */
export const matrixPlacement = pgTable(
    'matrix_placement',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        // Пользователь
        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        // Родитель в матрице (может отличаться от referrer)
        parentId: uuid('parent_id').references(() => appUser.id, { onDelete: 'set null' }),

        // Позиция относительно родителя: 'left' или 'right'
        position: text('position'), // null для root

        // Спонсор (реферер) - кто пригласил пользователя
        // Может отличаться от parentId (spillover)
        sponsorId: uuid('sponsor_id').references(() => appUser.id, { onDelete: 'set null' }),

        // Уровень в матрице (глубина от root)
        level: integer('level').notNull().default(0),

        // Статистика для бинарных бонусов
        leftLegVolume: numeric('left_leg_volume', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),
        rightLegVolume: numeric('right_leg_volume', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),

        // Счётчики прямых рефералов в каждой ноге
        leftLegCount: integer('left_leg_count').notNull().default(0),
        rightLegCount: integer('right_leg_count').notNull().default(0),

        // Флаг активности в матрице
        isActive: text('is_active').notNull().default('true'),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        // Каждый пользователь может быть только один раз в матрице
        uxUser: uniqueIndex('ux_matrix_placement_user').on(t.userId),

        // Индексы для быстрого поиска
        ixParent: index('ix_matrix_placement_parent').on(t.parentId),
        ixSponsor: index('ix_matrix_placement_sponsor').on(t.sponsorId),
        ixLevel: index('ix_matrix_placement_level').on(t.level),
        ixPosition: index('ix_matrix_placement_position').on(t.parentId, t.position),

        // CHECK: position должен быть 'left', 'right' или NULL
        chkPosition: check(
            'chk_matrix_placement_position',
            sql`${t.position} IS NULL OR ${t.position} IN ('left', 'right')`
        ),

        // CHECK: level >= 0
        chkLevel: check('chk_matrix_placement_level', sql`${t.level} >= 0`),

        // CHECK: volumes >= 0
        chkVolumes: check(
            'chk_matrix_placement_volumes',
            sql`${t.leftLegVolume} >= 0 AND ${t.rightLegVolume} >= 0`
        ),

        // CHECK: counts >= 0
        chkCounts: check(
            'chk_matrix_placement_counts',
            sql`${t.leftLegCount} >= 0 AND ${t.rightLegCount} >= 0`
        ),
    })
);

export type MatrixPlacement = typeof matrixPlacement.$inferSelect;
export type NewMatrixPlacement = typeof matrixPlacement.$inferInsert;
