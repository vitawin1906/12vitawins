// backend/drizzle/schema/_common.ts
import { timestamp } from 'drizzle-orm/pg-core';

/** created_at/updated_at — timestamptz NOT NULL DEFAULT now() */
export const createdAtCol = () =>
    timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const updatedAtCol = () =>
    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

/** Часто удобно добавить обе колонки одним вызовом */
export const createdUpdatedCols = () => ({
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
});

/** Опционально — для софт-удаления (если пригодится в админке/логах) */
export const deletedAtCol = () =>
    timestamp('deleted_at', { withTimezone: true });
