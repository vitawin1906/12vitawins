// backend/src/controllers/reviewController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { reviewService } from "../services/reviewService";
import { requireAdmin } from "../middleware/rbacMiddleware";

const CreateBody = z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    images: z.array(z.object({ url: z.string().url(), position: z.number().int().min(0) })).optional(),
});

const IdParam = z.object({ id: z.string().uuid() });

const PublicListQuery = z.object({
    productId: z.string().uuid(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    order: z.enum(['newest','oldest','rating_desc','rating_asc']).optional(),
});

const AdminListQuery = z.object({
    productId: z.string().uuid().optional(),
    status: z.enum(['pending','published','rejected']).optional(),
    minRating: z.coerce.number().int().min(1).max(5).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

export const reviewController = {
    // POST /api/reviews
    create: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreateBody.parse(req.body);
            const review = await reviewService.createReview({ userId: req.user!.id, ...body });
            return res.status(201).json({ success: true, data: review });
        }),
    ],

    // PUT /api/reviews/:id
    update: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const patch = UpdateBody.parse(req.body ?? {});
            const updated = await reviewService.updateReview({ reviewId: id, userId: req.user!.id, patch });
            return res.json({ success: true, data: updated });
        }),
    ],

    // DELETE /api/reviews/:id
    remove: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            await reviewService.deleteReview(id, req.user!.id);
            return res.json({ success: true, data: { id, deleted: true } });
        }),
    ],

    // GET /api/reviews (public, by product)
    listPublic: [
        asyncHandler(async (req: Request, res: Response) => {
            const q = PublicListQuery.parse(req.query);
            // убираем undefined-ключи
            const params = {
                productId: q.productId,
                ...(q.limit  !== undefined ? { limit:  q.limit  } : {}),
                ...(q.offset !== undefined ? { offset: q.offset } : {}),
                ...(q.order  !== undefined ? { order:  q.order  } : {}),
            } as const;
            const result = await reviewService.getProductReviews(params);
            return res.json({ success: true, data: result });
        }),
    ],

    // ADMIN: GET /api/admin/reviews
    adminList: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const q = AdminListQuery.parse(req.query);
            // критично для exactOptionalPropertyTypes: только присутствующие поля
            const params = {
                ...(q.productId  !== undefined ? { productId:  q.productId  } : {}),
                ...(q.status     !== undefined ? { status:     q.status     } : {}),
                ...(q.minRating  !== undefined ? { minRating:  q.minRating  } : {}),
                ...(q.limit      !== undefined ? { limit:      q.limit      } : {}),
                ...(q.offset     !== undefined ? { offset:     q.offset     } : {}),
            } satisfies Parameters<typeof reviewService.listAllReviews>[0];

            const items = await reviewService.listAllReviews(params);
            return res.json({ success: true, data: items });
        }),
    ],

    // ADMIN: POST /api/admin/reviews/:id/approve
    adminApprove: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const updated = await reviewService.approveReview(id, req.user!.id);
            return res.json({ success: true, data: updated });
        }),
    ],

    // ADMIN: POST /api/admin/reviews/:id/reject
    adminReject: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const updated = await reviewService.rejectReview(id, req.user!.id);
            return res.json({ success: true, data: updated });
        }),
    ],
};

// локально в этом файле — не забыть объявить UpdateBody
const UpdateBody = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(5000).optional(),
});
