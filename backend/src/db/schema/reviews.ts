import {
    pgTable, uuid, text, boolean, smallint, timestamp,
    index, primaryKey, uniqueIndex, check, jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { product, type ProductImageItem } from './products';
import { appUser } from './users';
import { createdAtCol, updatedAtCol } from './_common';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/* ======================== MAIN TABLE ======================== */

export const productReview = pgTable(
    'product_review',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        productId: uuid('product_id')
            .notNull()
            .references(() => product.id, { onDelete: 'cascade' }),

        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        rating: smallint('rating').notNull(),
        title: text('title'),
        body: text('body'),

        images: jsonb('images')
            .$type<ProductImageItem[]>()
            .notNull()
            .default(sql`'[]'::jsonb`),

        status: text('status').notNull().default('pending'),
        verifiedPurchase: boolean('verified_purchase')
            .notNull()
            .default(false),

        publishedAt: timestamp('published_at', { withTimezone: true }),
        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        uxProductUser: uniqueIndex('ux_review_product_user').on(
            t.productId,
            t.userId,
        ),

        ixProductStatus: index('ix_review_product_status').on(
            t.productId,
            t.status,
        ),
        ixUser: index('ix_review_user').on(t.userId),
        ixPublished: index('ix_review_published_at').on(t.publishedAt),

        chkRating: check(
            'chk_review_rating',
            sql`${t.rating} BETWEEN 1 AND 5`,
        ),
    }),
);

/* ======================== IMAGE TABLE ======================== */

export const productReviewImage = pgTable(
    'product_review_image',
    {
        reviewId: uuid('review_id')
            .references(() => productReview.id, { onDelete: 'cascade' })
            .notNull(),

        url: text('url').notNull(),
        position: smallint('position').notNull(),
    },
    (t) => ({
        pk: primaryKey(t.reviewId, t.position),
        ixReview: index('ix_review_images').on(t.reviewId),
    }),
);

/* ======================== TYPES ======================== */


export type ProductReview = InferSelectModel<typeof productReview>;
export type NewProductReview = InferInsertModel<typeof productReview>;

export type ProductReviewImage = InferSelectModel<typeof productReviewImage>;
export type NewProductReviewImage = InferInsertModel<typeof productReviewImage>;
