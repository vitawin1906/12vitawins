// src/storage/reviewsStorage.ts

import {
    and,
    asc,
    desc,
    eq,
    gte,
    lte,
    sql,
} from 'drizzle-orm';

import { db } from '#db/db';

import {
    productReview,
    productReviewImage,
} from '#db/schema/reviews';

import type {
    ProductReview,
    NewProductReview,
    ProductReviewImage,
    NewProductReviewImage,
} from '#db/schema/reviews';

/* ======================== Types ======================== */

export type Review = ProductReview;
export type NewReview = NewProductReview;

export type ReviewStatus = 'pending' | 'published' | 'rejected';

export interface ListReviewsParams {
    productId?: string;
    userId?: string;
    status?: ReviewStatus;
    minRating?: number;
    maxRating?: number;
    q?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
    order?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc';
}

/* ======================== Storage ======================== */

export const reviewsStorage = {
    /* ─────────────── CREATE ─────────────── */
    async create(
        data: Omit<NewReview, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'status'>
            & { status?: ReviewStatus }
    ): Promise<Review> {
        const patch: NewReview = {
            ...data,
            status: data.status ?? 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // нормализация рейтинга
        const raw = Number(patch.rating);
        patch.rating = Math.min(5, Math.max(1, isNaN(raw) ? 5 : raw));

        const [row] = await db.insert(productReview).values(patch).returning();
        return row!;
    },

    /* ─────────────── GET BY ID ─────────────── */
    async getById(id: string): Promise<Review | null> {
        const [row] = await db
            .select()
            .from(productReview)
            .where(eq(productReview.id, id))
            .limit(1);

        return row ?? null;
    },

    /* ─────────────── GET BY USER + PRODUCT ─────────────── */
    async getByUserAndProduct(
        userId: string,
        productId: string
    ): Promise<Review | null> {
        const [row] = await db
            .select()
            .from(productReview)
            .where(
                and(
                    eq(productReview.userId, userId),
                    eq(productReview.productId, productId)
                )
            )
            .limit(1);

        return row ?? null;
    },

    /* ─────────────── UPDATE ─────────────── */
    async update(
        id: string,
        patch: Partial<NewReview>
    ): Promise<Review | null> {
        const upd: Partial<NewReview> = {
            ...patch,
            updatedAt: new Date(),
        };

        if (upd.rating != null) {
            const raw = Number(upd.rating);
            upd.rating = Math.min(5, Math.max(1, isNaN(raw) ? 5 : raw)) as any;
        }

        const [row] = await db
            .update(productReview)
            .set(upd)
            .where(eq(productReview.id, id))
            .returning();

        return row ?? null;
    },

    /* ─────────────── DELETE ─────────────── */
    async deleteById(id: string): Promise<boolean> {
        const res = await db
            .delete(productReview)
            .where(eq(productReview.id, id))
            .returning({ id: productReview.id });

        return res.length > 0;
    },

    /* ─────────────── LIST ─────────────── */
    async list(params: ListReviewsParams = {}): Promise<Review[]> {
        const {
            productId,
            userId,
            status,
            minRating,
            maxRating,
            q,
            from,
            to,
            limit = 50,
            offset = 0,
            order = 'newest',
        } = params;

        const where: any[] = [];

        if (productId) where.push(eq(productReview.productId, productId));
        if (userId) where.push(eq(productReview.userId, userId));
        if (status) where.push(eq(productReview.status, status));

        if (minRating != null) where.push(sql`${productReview.rating} >= ${minRating}`);
        if (maxRating != null) where.push(sql`${productReview.rating} <= ${maxRating}`);

        if (from) where.push(gte(productReview.createdAt, from));
        if (to) where.push(lte(productReview.createdAt, to));

        if (q) {
            const qv = `%${q.trim()}%`;
            where.push(sql`
                (${productReview.title} ILIKE ${qv}
                    OR ${productReview.body} ILIKE ${qv})
            `);
        }

        let orderBy;
        switch (order) {
            case 'oldest': orderBy = asc(productReview.createdAt); break;
            case 'rating_desc': orderBy = desc(productReview.rating); break;
            case 'rating_asc': orderBy = asc(productReview.rating); break;
            default: orderBy = desc(productReview.createdAt);
        }

        return db
            .select()
            .from(productReview)
            .where(where.length ? (and as any)(...where) : undefined)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);
    },

    /* ─────────────── PRODUCT STATS ─────────────── */
    /* ─────────────── PRODUCT STATS ─────────────── */
    async getProductStats(productId: string, onlyStatus?: ReviewStatus) {
        const rows = await db.execute(sql/*sql*/`
            SELECT COALESCE(AVG(rating)::numeric (10, 2), 0) AS avg_rating,
                   COUNT(*)                                  AS total,
                   COUNT(*)                                     FILTER (WHERE rating = 5) AS r5, COUNT(*) FILTER (WHERE rating = 4) AS r4, COUNT(*) FILTER (WHERE rating = 3) AS r3, COUNT(*) FILTER (WHERE rating = 2) AS r2, COUNT(*) FILTER (WHERE rating = 1) AS r1
            FROM "product_review"
            WHERE product_id = ${productId} ${onlyStatus ? sql`AND status =
            ${onlyStatus}` : sql``}
        `) as unknown as Array<{
            avg_rating: string;
            total: string;
            r5: string;
            r4: string;
            r3: string;
            r2: string;
            r1: string;
        }>;

        const r = rows[0] ?? {
            avg_rating: '0',
            total: '0',
            r5: '0',
            r4: '0',
            r3: '0',
            r2: '0',
            r1: '0',
        };

        return {
            average: Number(r.avg_rating),
            total: Number(r.total),
            distribution: {
                5: Number(r.r5),
                4: Number(r.r4),
                3: Number(r.r3),
                2: Number(r.r2),
                1: Number(r.r1),
            },
        };
    },

    /* ─────────────── MODERATION ─────────────── */
    async publish(id: string): Promise<Review | null> {
        const [row] = await db
            .update(productReview)
            .set({
                status: 'published',
                publishedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(productReview.id, id))
            .returning();

        return row ?? null;
    },

    async unpublish(id: string): Promise<Review | null> {
        const [row] = await db
            .update(productReview)
            .set({
                status: 'pending',
                publishedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(productReview.id, id))
            .returning();

        return row ?? null;
    },

    async reject(id: string): Promise<Review | null> {
        const [row] = await db
            .update(productReview)
            .set({
                status: 'rejected',
                publishedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(productReview.id, id))
            .returning();

        return row ?? null;
    },

    /* ─────────────── IMAGE TABLE ─────────────── */
    async listImages(reviewId: string): Promise<ProductReviewImage[]> {
        return db
            .select()
            .from(productReviewImage)
            .where(eq(productReviewImage.reviewId, reviewId))
            .orderBy(asc(productReviewImage.position));
    },

    async addImage(input: NewProductReviewImage): Promise<ProductReviewImage> {
        const [row] = await db.insert(productReviewImage).values(input).returning();
        return row!;
    },

    async removeImage(reviewId: string, position: number): Promise<boolean> {
        const res = await db
            .delete(productReviewImage)
            .where(
                and(
                    eq(productReviewImage.reviewId, reviewId),
                    eq(productReviewImage.position, position)
                )
            )
            .returning({ reviewId: productReviewImage.reviewId });

        return res.length > 0;
    },

    async replaceImages(
        reviewId: string,
        images: Array<{ url: string; position: number }>
    ): Promise<void> {
        await db
            .delete(productReviewImage)
            .where(eq(productReviewImage.reviewId, reviewId));

        if (images.length === 0) return;

        const payload: NewProductReviewImage[] = images.map((i) => ({
            reviewId,
            url: i.url,
            position: i.position,
        }));

        await db.insert(productReviewImage).values(payload);
    },
};

export default reviewsStorage;
