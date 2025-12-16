// backend/drizzle/schema/addresses.ts
import {
    pgTable, serial, uuid, text, boolean, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './users';
import { addressTypeEnum } from './enums';
import { createdAtCol, updatedAtCol } from './_common';

export const address = pgTable('address', {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => appUser.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    state: text('state'),
    zip: text('zip').notNull(),
    country: text('country').notNull().default('Россия'),

    type: addressTypeEnum('type').notNull(), // 'home' | 'work'
    isDefault: boolean('is_default').notNull().default(false),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    ixUser: index('ix_address_user').on(t.userId),
    ixUserDefault: index('ix_address_user_default').on(t.userId, t.isDefault),

    // Один дефолтный адрес на пользователя
    uxUserDefaultOnce: uniqueIndex('ux_address_user_default_true')
        .on(t.userId)
        .where(sql`${t.isDefault} = true`),
}));

export type Address = typeof address.$inferSelect;
export type NewAddress = typeof address.$inferInsert;
