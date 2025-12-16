// backend/drizzle/schema/categories.ts
import { pgTable, uuid, text, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAtCol, updatedAtCol } from './_common';
import { categoryStatusEnum } from './enums';

export const category = pgTable(
    'category',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        description: text('description'),
        seo_title: text('seo_title'),
        seo_description: text('seo_description'),
        slug: varchar('slug', { length: 255 }).notNull(),
        status: categoryStatusEnum('status').notNull().default('active'),
        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uqSlug: uniqueIndex('uq_category_slug').on(t.slug),
        ixStatus: index('ix_category_status').on(t.status),
        ixName: index('ix_category_name').on(t.name),
    })
);

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;
