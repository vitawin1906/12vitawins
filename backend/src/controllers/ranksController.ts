// backend/src/controllers/ranksController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { ranksStorage } from '../storage/ranksStorage';
import { mlmRankEnum } from '#db/schema/enums';
import type { RankRuleInput } from '../storage/ranksStorage';

/* ───────────────── Enums (from DB) ───────────────── */

type RankCode = (typeof mlmRankEnum.enumValues)[number];
const ZRankCode = z.enum(mlmRankEnum.enumValues as [RankCode, ...RankCode[]]);

/* ───────────────── Validation Schemas ───────────────── */

const CreateRankSchema = z.object({
    rank: ZRankCode,                           // validate against DB enum
    name: z.string().min(1).max(200),
    requiredPv: z.coerce.number().nonnegative().optional(),
    requiredTurnover: z.coerce.number().nonnegative().optional(),
    bonusPercent: z.coerce.number().min(0).max(100).optional(),
    requiredLo: z.coerce.number().nonnegative().optional(),
    requiredActivePartners: z.coerce.number().int().nonnegative().optional(),
    requiredBranches: z.coerce.number().int().nonnegative().optional(),
    holdMonths: z.coerce.number().int().nonnegative().optional(),
    isCreator: z.boolean().optional(),
});

// UPDATE: без rank, все поля опциональны
const UpdateRankSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    requiredPv: z.coerce.number().nonnegative().optional(),
    requiredTurnover: z.coerce.number().nonnegative().optional(),
    bonusPercent: z.coerce.number().min(0).max(100).optional(),
    requiredLo: z.coerce.number().nonnegative().optional(),
    requiredActivePartners: z.coerce.number().int().nonnegative().nullable().optional(),
    requiredBranches: z.coerce.number().int().nonnegative().nullable().optional(),
    holdMonths: z.coerce.number().int().nonnegative().nullable().optional(),
    isCreator: z.boolean().optional(),
}).partial();

/* ───────────────── Ranks Controller ───────────────── */

export const ranksController = {
    /* ───────────────── Public Ranks ───────────────── */

    /** GET /api/ranks — список всех рангов (PUBLIC) */
    listRanks: [
        asyncHandler(async (req: Request, res: Response) => {
            const { limit, offset } = z.object({
                limit: z.coerce.number().int().min(1).max(200).default(100),
                offset: z.coerce.number().int().min(0).default(0),
            }).parse(req.query);

            const ranks = await ranksStorage.listRanks({ limit, offset });

            return res.json({
                success: true,
                ranks: ranks.map((r) => ({
                    rank: r.rank,
                    name: r.name,
                    requiredPv: r.requiredPv,
                    requiredTurnover: r.requiredTurnover,
                    bonusPercent: r.bonusPercent,
                    requiredLo: r.requiredLo,
                    requiredActivePartners: r.requiredActivePartners,
                    requiredBranches: r.requiredBranches,
                    holdMonths: r.holdMonths,
                    isCreator: r.isCreator,
                })),
            });
        }),
    ],

    /** GET /api/ranks/:rank — детали ранга (PUBLIC) */
    getRankByCode: [
        asyncHandler(async (req: Request, res: Response) => {
            const { rank } = z.object({ rank: ZRankCode }).parse(req.params);

            const row = await ranksStorage.getRankByCode(rank);
            if (!row) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Rank not found', 404);
            }

            return res.json({ success: true, rank: row });
        }),
    ],

    /* ───────────────── Admin Ranks Management ───────────────── */

    /** POST /api/admin/ranks — создать ранг (ADMIN) */
    createRank: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreateRankSchema.parse(req.body);

            const existing = await ranksStorage.getRankByCode(body.rank);
            if (existing) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Rank with this code already exists',
                    400,
                );
            }

            const created = await ranksStorage.createRank(body.rank, {
                name: body.name,
                requiredPv: body.requiredPv,
                requiredTurnover: body.requiredTurnover,
                bonusPercent: body.bonusPercent,
                requiredLo: body.requiredLo,
                requiredActivePartners: body.requiredActivePartners ?? null,
                requiredBranches: body.requiredBranches ?? null,
                holdMonths: body.holdMonths ?? null,
                isCreator: body.isCreator ?? null,
            });

            return res.status(201).json({
                success: true,
                message: 'Rank created successfully',
                rank: created,
            });
        }),
    ],

    /** PUT /api/admin/ranks/:rank — обновить ранг (ADMIN) */
    updateRank: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { rank } = z.object({ rank: ZRankCode }).parse(req.params);
            const body = UpdateRankSchema.parse(req.body);

            const existing = await ranksStorage.getRankByCode(rank);
            if (!existing) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Rank not found', 404);
            }

            // Собираем patch ТОЛЬКО из определённых значений (без undefined!)
            const patch: RankRuleInput = {};
            if (body.name !== undefined)                 patch.name = body.name;
            if (body.requiredPv !== undefined)           patch.requiredPv = body.requiredPv;
            if (body.requiredTurnover !== undefined)     patch.requiredTurnover = body.requiredTurnover;
            if (body.bonusPercent !== undefined)         patch.bonusPercent = body.bonusPercent;
            if (body.requiredLo !== undefined)           patch.requiredLo = body.requiredLo;
            if (body.requiredActivePartners !== undefined) patch.requiredActivePartners = body.requiredActivePartners;
            if (body.requiredBranches !== undefined)     patch.requiredBranches = body.requiredBranches;
            if (body.holdMonths !== undefined)           patch.holdMonths = body.holdMonths;
            if (body.isCreator !== undefined)            patch.isCreator = body.isCreator;

            const updated = await ranksStorage.updateRank(rank, patch);

            return res.json({
                success: true,
                message: 'Rank updated successfully',
                rank: updated,
            });
        }),
    ],

    /** DELETE /api/admin/ranks/:rank — удалить ранг (ADMIN) */
    deleteRank: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { rank } = z.object({ rank: ZRankCode }).parse(req.params);

            const existing = await ranksStorage.getRankByCode(rank);
            if (existing?.isCreator) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Cannot delete creator rank',
                    400,
                );
            }

            const deleted = await ranksStorage.deleteRank(rank);
            if (!deleted) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Rank not found', 404);
            }

            return res.json({ success: true, message: 'Rank deleted successfully' });
        }),
    ],

    /** POST /api/admin/ranks/ensure-creator — гарантировать наличие «создателя» (ADMIN) */
    ensureCreatorRank: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const rank = await ranksStorage.ensureCreatorRank();
            return res.json({
                success: true,
                message: 'Creator rank ensured',
                rank,
            });
        }),
    ],
};
