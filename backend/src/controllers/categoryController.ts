// backend/src/controllers/categoryController.ts
import type { Request, Response } from 'express';
import { z} from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import {categoriesService, type UpdateCategoryPatch} from '../services/categoriesService';
import { filterUndefined } from '../utils/objectHelpers';
import { ListQuery, SlugParam, IdParam, NonEmptyString } from '../validation/commonSchemas';
import { redisCache } from '../services/redisCache';

/* ───────────────── Validation Schemas ───────────────── */

const CreateCategorySchema = z.object({
    name: NonEmptyString.max(100),
    slug: NonEmptyString.max(100),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    isActive: z.boolean().default(true),
});

const UpdateCategorySchema = z.object({
    name: NonEmptyString.max(100).optional(),
    slug: NonEmptyString.max(100).optional(),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
});

/* ───────────────── Category Controller ───────────────── */

export const categoryController = {
    /**
     * GET /api/categories
     * Список категорий (PUBLIC)
     */
    listCategories: [
        asyncHandler(async (req: Request, res: Response) => {
            const q = ListQuery.parse(req.query);

            // Check Redis cache
            const cacheKey = 'categories:list:with-count';
            const cached = await redisCache.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }

            // ← считаем productCount в БД одним запросом
            const categories = await categoriesService.listWithProductCount();
            const response = { success: true, categories };

            // Cache for short TTL (20s)
            await redisCache.set(cacheKey, JSON.stringify(response), 20);

            return res.json(response);
        }),
    ],


    /**
     * GET /api/categories/:slug
     * Категория по slug (PUBLIC)
     */
    getCategoryBySlug: [
        asyncHandler(async (req: Request, res: Response) => {
            const { slug } = SlugParam.parse(req.params);
            const category = await categoriesService.getBySlug(slug);
            if (!category) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Category not found', 404);
            }
            return res.json({ success: true, category });
        }),
    ],

    /**
     * POST /api/admin/categories
     * Создать категорию (ADMIN)
     */
    createCategory: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreateCategorySchema.parse(req.body);

            // ❗ filterUndefined НЕ НУЖЕН
            const category = await categoriesService.create(body);

            return res.status(201).json({
                success: true,
                message: 'Category created successfully',
                category,
            });
        }),
    ],


    /**
     * PUT /api/admin/categories/:id
     * Обновить категорию (ADMIN)
     */
    updateCategory: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: categoryId } = IdParam.parse(req.params);
            const body = UpdateCategorySchema.parse(req.body);

            // ❗ здесь filterUndefined допустим, но нужен ЯВНЫЙ тип
            const patch: UpdateCategoryPatch = filterUndefined(body);

            const category = await categoriesService.update(categoryId, patch);

            return res.json({
                success: true,
                message: 'Category updated successfully',
                category,
            });
        }),
    ],
    /**
     * DELETE /api/admin/categories/:id
     * Удалить категорию (ADMIN)
     */
    deleteCategory: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: categoryId } = IdParam.parse(req.params);

            const ok = await categoriesService.delete(categoryId);

            if (!ok) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Category not found', 404);
            }

            return res.json({ success: true, message: 'Category deleted successfully' });
        }),
    ],};
