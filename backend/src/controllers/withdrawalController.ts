// backend/src/controllers/withdrawalController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { withdrawalsService } from '../services/withdrawalService';
import { requireAdmin } from '../middleware/rbacMiddleware';

// ───────── Schemas aligned with service DTOs ─────────

const CreateBody = z.object({
    amountRub: z.union([z.string(), z.number()]),
    method: z.string().min(1), // валидируется в сервисе через enum
    destination: z.record(z.string(), z.any()).optional(),
    idempotencyKey: z.string().min(8).max(256),
    metadata: z.record(z.string(), z.any()).optional(),
});

const IdParam = z.object({ id: z.string().uuid() });

const AdminApproveBody = z.object({ note: z.string().max(1000).optional() });
const AdminRejectBody = z.object({ reason: z.string().min(2).max(2000) });
const AdminMarkPaidBody = z.object({ providerInfo: z.record(z.string(), z.any()).default({}) });

// фильтры списка для админа
const AdminListQuery = z.object({
    userId: z.string().uuid().optional(),
    status: z.enum(['requested', 'in_review', 'approved', 'rejected', 'paid', 'canceled']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

// фильтры для /withdrawals/me
const MyListQuery = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

export const withdrawalController = {
    // POST /api/withdrawals
    create: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreateBody.parse(req.body);
            const userId = req.user!.id;

            const created = await withdrawalsService.create({
                userId,
                amountRub: body.amountRub as any,
                method: body.method as any,
                destination: body.destination ?? {},
                idempotencyKey: body.idempotencyKey,
                metadata: body.metadata,
            } as any);

            return res.status(201).json({ success: true, data: created });
        }),
    ],

    // GET /api/withdrawals/me
    myList: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const q = MyListQuery.parse(req.query);
            const items = await withdrawalsService.listByUser(
                req.user!.id,
                q.limit ?? 50,
                q.offset ?? 0,
            );
            return res.json({ success: true, data: items });
        }),
    ],

    // DELETE /api/withdrawals/:id (cancel own if allowed)
    cancel: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const updated = await withdrawalsService.cancel(id, req.user!.id);
            return res.json({ success: true, data: updated });
        }),
    ],

    // ADMIN: GET /api/admin/withdrawals
    adminList: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const q = AdminListQuery.parse(req.query);

            // важный фикс для exactOptionalPropertyTypes
            const filters: {
                userId?: string;
                status?: 'requested' | 'in_review' | 'approved' | 'rejected' | 'paid' | 'canceled';
                limit?: number;
                offset?: number;
            } = {};

            if (q.userId) filters.userId = q.userId;
            if (q.status) filters.status = q.status;
            if (q.limit !== undefined) filters.limit = q.limit;
            if (q.offset !== undefined) filters.offset = q.offset;

            const items = await withdrawalsService.listAll(filters);
            return res.json({ success: true, data: items });
        }),
    ],

    // ADMIN: POST /api/admin/withdrawals/:id/approve
    adminApprove: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const body = AdminApproveBody.parse(req.body ?? {});
            const updated = await withdrawalsService.approve({
                id,
                adminId: req.user!.id,
                note: body.note,
            });
            return res.json({ success: true, data: updated });
        }),
    ],

    // ADMIN: POST /api/admin/withdrawals/:id/reject
    adminReject: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const body = AdminRejectBody.parse(req.body);
            const updated = await withdrawalsService.reject({
                id,
                adminId: req.user!.id,
                reason: body.reason,
            });
            return res.json({ success: true, data: updated });
        }),
    ],

    // ADMIN: POST /api/admin/withdrawals/:id/mark-paid
    adminMarkPaid: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const body = AdminMarkPaidBody.parse(req.body ?? {});
            const updated = await withdrawalsService.markPaid({
                id,
                adminId: req.user!.id,
                providerInfo: body.providerInfo,
            });
            return res.json({ success: true, data: updated });
        }),
    ],
};
