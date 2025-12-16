// backend/drizzle/schema/network.ts (или где у тебя network_edge)
import { pgTable, uuid, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './users';        // путь поправь под свой
import { createdAtCol } from './_common';  // если используешь этот хелпер

export const networkEdge = pgTable('network_edge', {
    id: uuid('id').primaryKey().defaultRandom(),

    parentId: uuid('parent_id')
        .notNull()
        .references(() => appUser.id, { onDelete: 'cascade' }),

    childId: uuid('child_id')
        .notNull()
        .references(() => appUser.id, { onDelete: 'cascade' }),

    createdAt: createdAtCol(), // или: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({

    uxPair: uniqueIndex('ux_network_edge_pair').on(t.parentId, t.childId),
    // ✅ Ровно один аплайн у узла
    uxChild: uniqueIndex('ux_network_edge_child').on(t.childId),
    // Индексы на чтение
    ixParent: index('ix_network_edge_parent').on(t.parentId),
    ixChild:  index('ix_network_edge_child').on(t.childId),
    // CHECK без самоссылки
    chkNoSelf: check('chk_network_no_self_link', sql`${t.parentId} <> ${t.childId}`),
}));
