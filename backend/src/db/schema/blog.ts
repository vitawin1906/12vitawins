// backend/drizzle/schema/blog.ts
import {
    pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { blogStatusEnum } from './enums';
import {uploadedMedia} from "./media";

/**
 * Блог-пост по DTO из contracts:
 * title/excerpt/author/publishDate/category(custom slug)/customUrl/keywords/status/readTime/images
 */
export const blogPosts = pgTable(
    'blog_posts',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        title: text('title').notNull(),
        excerpt: text('excerpt').notNull(),
        author: text('author').notNull(),

        publishDate: timestamp('publish_date', { withTimezone: true })
            .defaultNow()
            .notNull(),
        categorySlug: text('category_slug'),   // slug категории из справочника
        customUrl: text('custom_url').notNull(),         // URL-путь (slug поста)

        keywords: text('keywords'),
        status: blogStatusEnum('status').notNull(),      // 'published' | 'draft'
        readTime: integer('read_time'),

        images: jsonb('images').$type<string[]>().notNull().default(sql`'[]'::jsonb`),

        // hero-картинка (если используется загрузка в CDN)
        heroMediaId: uuid('hero_media_id')
            .references(() => uploadedMedia.id, { onDelete: 'set null' }),
        // опционально: основное содержимое (если нет внешней CMS)
        content: text('content'),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uxUrl: uniqueIndex('ux_blog_custom_url').on(t.customUrl),
        ixDate: index('ix_blog_publish_date').on(t.publishDate),
        ixCat: index('ix_blog_category').on(t.categorySlug),
        ixStat: index('ix_blog_status').on(t.status),
    }),
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
