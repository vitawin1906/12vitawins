// backend/src/routes/promoCodes.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { db } from '#db/db';
import { promoCode, promoCodeUsage } from '#db/schema/promoCodes';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/* ───────────────── ADMIN: Управление промокодами ───────────────── */

/** GET /api/admin/promo-codes — Список всех промокодов */
router.get(
    '/admin/promo-codes',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const offset = req.query.offset ? Number(req.query.offset) : 0;

        const codes = await db
            .select()
            .from(promoCode)
            .orderBy(desc(promoCode.createdAt))
            .limit(limit)
            .offset(offset);

        return res.json({
            success: true,
            promoCodes: codes.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                type: c.type,
                percentOff: c.percentOff,
                fixedAmountRub: c.fixedAmountRub,
                minOrderRub: c.minOrderRub,
                maxUses: c.maxUses,
                currentUses: c.currentUses,
                onePerUser: c.onePerUser,
                isActive: c.isActive,
                startsAt: c.startsAt,
                expiresAt: c.expiresAt,
                createdAt: c.createdAt,
            })),
            pagination: { limit, offset },
        });
    })
);

/** POST /api/admin/promo-codes — Создать промокод */
router.post(
    '/admin/promo-codes',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const CreatePromoCodeSchema = z.object({
            code: z.string().min(3).max(50).toUpperCase(),
            name: z.string().min(3).max(255),
            type: z.enum(['percent_off', 'fixed_amount']),
            percentOff: z.number().min(0).max(100).optional(),
            fixedAmountRub: z.number().min(0).optional(),
            minOrderRub: z.number().min(0).default(0),
            maxUses: z.number().int().min(1).optional(),
            onePerUser: z.boolean().default(false),
            isActive: z.boolean().default(true),
            startsAt: z.string().datetime().optional(),
            expiresAt: z.string().datetime().optional(),
        });

        const body = CreatePromoCodeSchema.parse(req.body);

        // Валидация: для percent_off нужен percentOff, для fixed_amount — fixedAmountRub
        if (body.type === 'percent_off' && !body.percentOff) {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                'percentOff is required for type percent_off',
                400
            );
        }
        if (body.type === 'fixed_amount' && !body.fixedAmountRub) {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                'fixedAmountRub is required for type fixed_amount',
                400
            );
        }

        // Проверка на уникальность кода
        const [existing] = await db
            .select()
            .from(promoCode)
            .where(eq(promoCode.code, body.code))
            .limit(1);

        if (existing) {
            throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Promo code already exists', 400);
        }

        const [created] = await db
            .insert(promoCode)
            .values({
                code: body.code,
                name: body.name,
                type: body.type,
                percentOff: body.percentOff ? String(body.percentOff) : null,
                fixedAmountRub: body.fixedAmountRub ? String(body.fixedAmountRub) : null,
                minOrderRub: String(body.minOrderRub),
                maxUses: body.maxUses ?? null,
                currentUses: 0,
                onePerUser: body.onePerUser,
                isActive: body.isActive,
                startsAt: body.startsAt ? new Date(body.startsAt) : null,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            })
            .returning();

        return res.status(201).json({
            success: true,
            message: 'Promo code created',
            promoCode: created,
        });
    })
);

/** PUT /api/admin/promo-codes/:id — Обновить промокод */
router.put(
    '/admin/promo-codes/:id',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

        const UpdatePromoCodeSchema = z.object({
            name: z.string().min(3).max(255).optional(),
            isActive: z.boolean().optional(),
            maxUses: z.number().int().min(1).optional(),
            startsAt: z.string().datetime().optional(),
            expiresAt: z.string().datetime().optional(),
        });

        const body = UpdatePromoCodeSchema.parse(req.body);

        const [updated] = await db
            .update(promoCode)
            .set({
                ...(body.name ? { name: body.name } : {}),
                ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
                ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
                ...(body.startsAt ? { startsAt: new Date(body.startsAt) } : {}),
                ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {}),
                updatedAt: new Date(),
            })
            .where(eq(promoCode.id, id))
            .returning();

        if (!updated) {
            throw new AppError(AppErrorCode.NOT_FOUND, 'Promo code not found', 404);
        }

        return res.json({
            success: true,
            message: 'Promo code updated',
            promoCode: updated,
        });
    })
);

/** DELETE /api/admin/promo-codes/:id — Удалить промокод */
router.delete(
    '/admin/promo-codes/:id',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

        const [deleted] = await db.delete(promoCode).where(eq(promoCode.id, id)).returning();

        if (!deleted) {
            throw new AppError(AppErrorCode.NOT_FOUND, 'Promo code not found', 404);
        }

        return res.json({
            success: true,
            message: 'Promo code deleted',
        });
    })
);

/** GET /api/admin/promo-codes/:id/usage — История использования промокода */
router.get(
    '/admin/promo-codes/:id/usage',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

        const usage = await db
            .select()
            .from(promoCodeUsage)
            .where(eq(promoCodeUsage.promoCodeId, id))
            .orderBy(desc(promoCodeUsage.createdAt));

        return res.json({
            success: true,
            usage: usage.map((u) => ({
                id: u.id,
                userId: u.userId,
                orderId: u.orderId,
                discountRub: u.discountRub,
                createdAt: u.createdAt,
            })),
        });
    })
);

/* ───────────────── USER: Валидация промокода перед применением ───────────────── */

/** POST /api/promo-codes/validate — Проверить промокод (для пользователя перед оформлением заказа) */
router.post(
    '/promo-codes/validate',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const ValidateSchema = z.object({
            code: z.string().min(1).max(50),
            orderSubtotalRub: z.number().min(0),
        });

        const body = ValidateSchema.parse(req.body);
        const userId = req.user!.id;

        const { promoCodeService } = await import('../services/promoCodeService');

        try {
            const result = await promoCodeService.validateAndCalculate({
                code: body.code,
                userId,
                orderSubtotalRub: body.orderSubtotalRub,
            });

            return res.json({
                success: true,
                valid: true,
                promoCode: {
                    code: result.code,
                    type: result.type,
                    discountRub: result.discountRub,
                },
            });
        } catch (error: any) {
            // Если промокод невалиден, возвращаем ошибку с деталями
            return res.status(400).json({
                success: false,
                valid: false,
                error: error.message || 'Invalid promo code',
            });
        }
    })
);

export default router;
