// backend/src/services/reviewService.ts
import { z } from 'zod';
import { db } from '#db/db';
import { order as orderTable } from '#db/schema/orders';
import { orderItem } from '#db/schema/orderItem';
import { and, eq, sql } from 'drizzle-orm';
import { reviewsStorage } from '#storage/reviewsStorage';
import type { ProductReview } from '#db/schema/reviews';
import { AppError, AppErrorCode } from './../middleware/errorHandler';

const CreateSchema = z.object({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  images: z
    .array(z.object({ url: z.string().url(), position: z.number().int().min(0) }))
    .optional(),
});

const GetProductReviewsSchema = z.object({
  productId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  order: z.enum(['newest', 'oldest', 'rating_desc', 'rating_asc']).optional(),
});

const UpdateSchema = z.object({
  reviewId: z.string().uuid(),
  userId: z.string().uuid(),
  patch: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(5000).optional(),
  }),
});

export const reviewService = {
  async createReview(params: z.infer<typeof CreateSchema>): Promise<ProductReview> {
    const data = CreateSchema.parse(params);

    // 1) Проверить покупку: хотя бы один заказ delivered где есть productId
    // КРИТИЧНО: Используем delivery_status='delivered', а НЕ order.status
    const [row] = (await db.execute(sql/*sql*/`
      SELECT EXISTS (
        SELECT 1
        FROM "order" o
        JOIN order_item oi ON o.id = oi.order_id
        WHERE o.user_id = ${data.userId}
          AND oi.product_id = ${data.productId}
          AND o.delivery_status = 'delivered'
      ) AS has
    `)) as unknown as Array<{ has: boolean }>;

    if (!row?.has) {
      throw new AppError(
        AppErrorCode.FORBIDDEN,
        'Only buyers who received the product can leave a review',
        403,
      );
    }

    // 2) Проверить, что ещё не оставлен (уникальный индекс гарантирует, но дадим дружественную ошибку)
    const existing = await reviewsStorage.getByUserAndProduct(data.userId, data.productId);
    if (existing) {
      throw new AppError(AppErrorCode.DUPLICATE_ENTRY, 'Review already exists', 409);
    }

    // 3) Создать pending
    const review = await reviewsStorage.create({
      userId: data.userId,
      productId: data.productId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      status: 'pending',
    } as any);

    if (data.images?.length) {
      await reviewsStorage.replaceImages(review.id, data.images);
    }

    return review;
  },

  async getProductReviews(params: z.infer<typeof GetProductReviewsSchema>): Promise<{
    items: ProductReview[];
    stats: {
      average: number;
      total: number;
      distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    };
  }> {
    const { productId, limit = 20, offset = 0, order = 'newest' } = GetProductReviewsSchema.parse(params);

    const items = await reviewsStorage.list({ productId, status: 'published', limit, offset, order });
    const statsRaw = await reviewsStorage.getProductStats(productId, 'published');

    const stats = {
      average: statsRaw.average,
      total: statsRaw.total,
      distribution: {
        1: statsRaw.distribution[1],
        2: statsRaw.distribution[2],
        3: statsRaw.distribution[3],
        4: statsRaw.distribution[4],
        5: statsRaw.distribution[5],
      },
    } as const;

    return { items, stats } as any;
  },

  async getUserReview(userId: string, productId: string): Promise<ProductReview | null> {
    const s = z.object({ userId: z.string().uuid(), productId: z.string().uuid() }).parse({ userId, productId });
    return reviewsStorage.getByUserAndProduct(s.userId, s.productId);
  },

  async updateReview(params: z.infer<typeof UpdateSchema>): Promise<ProductReview> {
    const { reviewId, userId, patch } = UpdateSchema.parse(params);
    const existing = await reviewsStorage.getById(reviewId);
    if (!existing) throw new AppError(AppErrorCode.NOT_FOUND, 'Review not found', 404);
    if (existing.userId !== userId) {
      throw new AppError(AppErrorCode.FORBIDDEN, 'You can update only your review', 403);
    }
    if (existing.status !== 'pending') {
      throw new AppError(AppErrorCode.FORBIDDEN, 'Only pending reviews can be updated', 403);
    }

    const updated = await reviewsStorage.update(reviewId, patch as any);
    return updated!;
  },

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const s = z.object({ reviewId: z.string().uuid(), userId: z.string().uuid() }).parse({ reviewId, userId });
    const existing = await reviewsStorage.getById(s.reviewId);
    if (!existing) return;
    if (existing.userId !== s.userId) {
      throw new AppError(AppErrorCode.FORBIDDEN, 'You can delete only your review', 403);
    }
    if (existing.status !== 'pending') {
      throw new AppError(AppErrorCode.FORBIDDEN, 'Only pending reviews can be deleted', 403);
    }
    await reviewsStorage.deleteById(s.reviewId);
  },

  async approveReview(reviewId: string, adminId: string): Promise<ProductReview> {
    const s = z.object({ reviewId: z.string().uuid(), adminId: z.string().uuid() }).parse({ reviewId, adminId });
    const existing = await reviewsStorage.getById(s.reviewId);
    if (!existing) throw new AppError(AppErrorCode.NOT_FOUND, 'Review not found', 404);
    const updated = await reviewsStorage.publish(s.reviewId);
    return updated!;
  },

  async rejectReview(reviewId: string, adminId: string): Promise<ProductReview> {
    const s = z.object({ reviewId: z.string().uuid(), adminId: z.string().uuid() }).parse({ reviewId, adminId });
    const existing = await reviewsStorage.getById(s.reviewId);
    if (!existing) throw new AppError(AppErrorCode.NOT_FOUND, 'Review not found', 404);
    const updated = await reviewsStorage.reject(s.reviewId);
    return updated!;
  },

    async listAllReviews(filters: {
        status?: 'pending' | 'published' | 'rejected';
        productId?: string;
        minRating?: number;
        limit?: number;
        offset?: number;
    }): Promise<ProductReview[]> {
        const s = z.object({
            status: z.enum(['pending','published','rejected']).optional(),
            productId: z.string().uuid().optional(),
            minRating: z.number().int().min(1).max(5).optional(),
            limit: z.number().int().min(1).max(200).optional(),
            offset: z.number().int().min(0).optional(),
        }).parse(filters ?? {});

        // Собираем параметры без undefined-ключей (важно для exactOptionalPropertyTypes)
        const params: Parameters<typeof reviewsStorage.list>[0] = {
            ...(s.status !== undefined ? { status: s.status } : {}),
            ...(s.productId !== undefined ? { productId: s.productId } : {}),
            ...(s.minRating !== undefined ? { minRating: s.minRating } : {}),
            ...(s.limit !== undefined ? { limit: s.limit } : {}),
            ...(s.offset !== undefined ? { offset: s.offset } : {}),
        };

        return reviewsStorage.list(params);
    }

};
