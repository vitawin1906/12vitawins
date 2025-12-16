import {pgTable, serial, bigint, timestamp, uniqueIndex, text} from 'drizzle-orm/pg-core';
import { createdAtCol } from './_common';

/**
 * pro_assignment_pool — пул PRO-партнёров (по Telegram ID)
 * используется CreatorPoolService и при автопривязке без реферального кода.
 */
export const proAssignmentPool = pgTable('pro_assignment_pool', {
    id: serial('id').primaryKey(),
    telegramId: text('telegram_id').notNull(),
    createdAt: createdAtCol(),
}, (t) => ({
    uxTelegram: uniqueIndex('ux_pro_assignment_pool_telegram').on(t.telegramId),
}));

export type ProAssignmentPool = typeof proAssignmentPool.$inferSelect;
export type NewProAssignmentPool = typeof proAssignmentPool.$inferInsert;
