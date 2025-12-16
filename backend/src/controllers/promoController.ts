// backend/src/controllers/promoController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { promotionsStorage } from '#storage/promosStorage';
import type {NewPromotion} from "#db/schema/promotions";

/* ───────────────── Validation Schemas ───────────────── */

const CreatePromotionSchema = z.object({
    name: z.string().min(1).max(200),
    kind: z.string().min(1).max(50), // 'bundle', 'discount', 'buy_x_get_y', etc.
    isActive: z.boolean().default(true),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    buyQty: z.number().int().positive().optional(),
    getQty: z.number().int().positive().optional(),
    percentOff: z.number().min(0).max(100).optional(),
    fixedPriceRub: z.number().positive().optional(),
});

const UpdatePromotionSchema = CreatePromotionSchema.partial();

const AddProductToPromoSchema = z.object({
    productId: z.string().uuid(),
});

/* helpers */
const IdParam = z.object({ id: z.coerce.number().int().positive() });
// NUMERIC(2) в БД: приводим number → 'xx.yy'
const toPgNum = (v: number | undefined) =>
    v === undefined ? undefined : v.toFixed(2);

/* ───────────────── Promo Controller ───────────────── */

export const promoController = {
    /* ───────────────── Public Promotions ───────────────── */

    /**
     * GET /api/promo/active
     * Активные акции (PUBLIC)
     */
    listActivePromotions: [
        asyncHandler(async (_req: Request, res: Response) => {
            // storage предоставляет listActivePromotionsAt(date)
            const promotions = await promotionsStorage.listActivePromotionsAt(new Date());

            return res.json({
                success: true,
                promotions: promotions.map((p) => ({
                    id: p.id,
                    name: p.name,
                    kind: p.kind,
                    startsAt: p.startsAt,
                    endsAt: p.endsAt,
                    buyQty: p.buyQty,
                    getQty: p.getQty,
                    percentOff: p.percentOff,
                    fixedPriceRub: p.fixedPriceRub,
                })),
            });
        }),
    ],

    /**
     * GET /api/promo/:id
     * Детали акции (PUBLIC)
     */
    getPromotionById: [
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);

            const promotion = await promotionsStorage.getPromotionById(id);
            if (!promotion) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Promotion not found', 404);
            }

            return res.json({ success: true, promotion });
        }),
    ],

    /**
     * GET /api/promo/:id/products
     * Товары в акции (PUBLIC)
     */
    getPromotionProducts: [
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);

            const products = await promotionsStorage.listPromotionProducts(id);

            return res.json({ success: true, products });
        }),
    ],

    /* ───────────────── Admin Promotions Management ───────────────── */

    /**
     * GET /api/admin/promo
     * Все акции (ADMIN)
     */
    listAllPromotions: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            // storage метод: listPromotions(...)
            const promotions = await promotionsStorage.listPromotions();

            return res.json({ success: true, promotions });
        }),
    ],

    /**
     * POST /api/admin/promo
     * Создать акцию (ADMIN)
     */
    createPromotion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreatePromotionSchema.parse(req.body);

            const promotion = await promotionsStorage.createPromotion({
                name: body.name,
                kind: body.kind,
                isActive: body.isActive,
                startsAt: body.startsAt ? new Date(body.startsAt) : null,
                endsAt: body.endsAt ? new Date(body.endsAt) : null,
                buyQty: body.buyQty ?? null,
                getQty: body.getQty ?? null,
                // createPromotion принимает NumLike, number допустим
                percentOff: body.percentOff,
                fixedPriceRub: body.fixedPriceRub,
            });

            return res.status(201).json({
                success: true,
                message: 'Promotion created successfully',
                promotion,
            });
        }),
    ],

    /**
     * PUT /api/admin/promo/:id
     * Обновить акцию (ADMIN)
     */
    /** PUT /api/admin/promo/:id — Обновить акцию (ADMIN) */
    updatePromotion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
            const body = UpdatePromotionSchema.parse(req.body);

            // Собираем patch без undefined (важно при exactOptionalPropertyTypes)
            const patch: Partial<NewPromotion> = {};
            if (body.name !== undefined)        patch.name        = body.name;
            if (body.kind !== undefined)        patch.kind        = body.kind;
            if (body.isActive !== undefined)    patch.isActive    = body.isActive;
            if (body.startsAt !== undefined)    patch.startsAt    = new Date(body.startsAt);
            if (body.endsAt !== undefined)      patch.endsAt      = new Date(body.endsAt);
            if (body.buyQty !== undefined)      patch.buyQty      = body.buyQty;
            if (body.getQty !== undefined)      patch.getQty      = body.getQty;
            if (body.percentOff !== undefined)  patch.percentOff  = toPgNum(body.percentOff)!;   // -> 'xx.yy'
            if (body.fixedPriceRub !== undefined) patch.fixedPriceRub = toPgNum(body.fixedPriceRub)!; // -> 'xx.yy'

            const updated = await promotionsStorage.updatePromotion(id, patch);

            return res.json({
                success: true,
                message: 'Promotion updated successfully',
                promotion: updated,
            });
        }),
    ],

    /**
     * DELETE /api/admin/promo/:id
     * Удалить акцию (ADMIN)
     */
    deletePromotion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);

            const deleted = await promotionsStorage.deletePromotion(id);
            if (!deleted) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Promotion not found', 404);
            }

            return res.json({ success: true, message: 'Promotion deleted successfully' });
        }),
    ],

    /**
     * POST /api/admin/promo/:id/activate
     * Активировать/деактивировать акцию (ADMIN)
     */
    togglePromotion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

            const updated = await promotionsStorage.activatePromotion(id, isActive);

            return res.json({
                success: true,
                message: `Promotion ${isActive ? 'activated' : 'deactivated'}`,
                promotion: updated,
            });
        }),
    ],

    /**
     * POST /api/admin/promo/:id/products
     * Добавить товар в акцию (ADMIN)
     */
    addProductToPromotion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const { productId } = AddProductToPromoSchema.parse(req.body);

            await promotionsStorage.addProductToPromotion({ promotionId: id, productId });

            return res.status(201).json({
                success: true,
                message: 'Product added to promotion',
            });
        }),
    ],

    /**
     * DELETE /api/admin/promo/:id/products/:productId
     * Удалить товар из акции (ADMIN)
     */
    removeProductFromPromotion: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const productId = z.string().uuid().parse(req.params.productId);

            const removed = await promotionsStorage.removeProductFromPromotion(id, productId);
            if (!removed) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Product not in promotion', 404);
            }

            return res.json({ success: true, message: 'Product removed from promotion' });
        }),
    ],
};
