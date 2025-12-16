// backend/src/controllers/productsController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
    ProductCreateDto,
    ProductUpdateDto,
    ProductListQueryDto,
    ProductIdParamDto,
    ProductSlugParamDto,
} from '#db/shemaTypes/productsType';

import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { errorMonitoringService } from '../services/errorMonitoringService';

import { db } from '#db/db';
import { product } from '#db/schema/products';
import { category } from '#db/schema/categories';

import { eq, inArray } from 'drizzle-orm';
import { productStorage } from '#storage/productsStorage';
import { redisCache } from '../services/redisCache';

/* ───────────────── Helpers ───────────────── */

function isPgUniqueError(e: any) {
    return e && (e.code === '23505' || /duplicate|unique/i.test(String(e.message || '')));
}

const nullifyEmpty = <T = unknown>(v: T | '' | undefined | null): T | null =>
    v === '' || v === undefined || v === null ? null : (v as T);

// единичная категория (вход может быть по id или по slug для удобства админки)
const CategoryInputDto = z.object({
    categoryId: z.string().uuid().optional(),
    categorySlug: z.string().min(1).optional(),
}).refine((d) => d.categoryId || d.categorySlug, {
    message: 'Provide categoryId or categorySlug',
});

async function resolveCategoryId(input: z.infer<typeof CategoryInputDto>): Promise<string> {
    if (input.categoryId) return input.categoryId;
    const slug = input.categorySlug!;
    const row = await db.select({ id: category.id }).from(category).where(eq(category.slug, slug)).limit(1);
    const id = row[0]?.id;
    if (!id) throw new AppError(AppErrorCode.NOT_FOUND, 'Unknown category slug', 404, { slug });
    return id;
}

function uniqueFieldFromError(e: any): 'slug' | 'sku' | undefined {
    const msg = String(e?.detail || e?.message || '').toLowerCase();
    if (msg.includes('uq_product_slug') || msg.includes('slug')) return 'slug';
    if (msg.includes('ux_product_sku_nullable') || msg.includes('sku')) return 'sku';
    return undefined;
}

// Тип категории для ответа контроллера (исключаем nullable в name/slug)
type CatDTO = { id: string; name: string; slug: string };

// Присоединить категорию (name/slug) к рядам
async function attachCategory<T extends { id: string }>(rows: T[]) {
    if (!rows.length) return rows.map((r) => ({ ...r, category: null as CatDTO | null }));
    const ids = rows.map((r) => r.id);
    const joined = await db
        .select({
            productId: product.id,
            catId: category.id,
            catName: category.name,
            catSlug: category.slug,
        })
        .from(product)
        .leftJoin(category, eq(product.categoryId, category.id))
        .where(inArray(product.id, ids));

    const map = new Map<string, CatDTO | null>();
    for (const r of joined) {
        map.set(
            r.productId,
            r.catId ? { id: r.catId, name: r.catName!, slug: r.catSlug! } : null,
        );
    }
    return rows.map((r) => ({ ...r, category: map.get(r.id) ?? null }));
}

/* ───────────────── Products Controller ───────────────── */

export const productsController = {
    /** GET /api/products */
    getProducts: [
        asyncHandler(async (req: Request, res: Response) => {
            const validated = (req as any).validated?.query as z.infer<typeof ProductListQueryDto> | undefined;
            const d = validated ?? ProductListQueryDto.parse(req.query);

            const listParams = {
                ...(d.q && { q: d.q }),
                ...(d.status && { status: d.status }),
                ...(d.uiStatus && { uiStatus: d.uiStatus }),
                ...(d.inStock != null && { inStock: d.inStock }),
                ...(d.minPrice != null && { minPrice: d.minPrice }),
                ...(d.maxPrice != null && { maxPrice: d.maxPrice }),
                ...(d.orderBy && { orderBy: d.orderBy }),
                ...(d.orderDir && { orderDir: d.orderDir }),
                ...(d.categoryId && { categoryId: d.categoryId }),
                limit: d.limit,
                offset: d.offset,
            };

            // Check Redis cache
            const cacheKey = `products:list:${JSON.stringify(listParams)}`;
            const cached = await redisCache.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }

            const rows = await productStorage.list(listParams as any);
            const withCategory = await attachCategory(rows);

            // Cache for short TTL (20s)
            await redisCache.set(cacheKey, JSON.stringify(withCategory), 20);

            return res.json(withCategory);
        }),
    ],

    /** GET /api/products/:id */
    getProductById: [
        asyncHandler(async (req: Request, res: Response) => {
            const parsed = ProductIdParamDto.parse(req.params);

            const p = await productStorage.getById(parsed.id);
            if (!p) throw new AppError(AppErrorCode.NOT_FOUND, 'Product not found', 404);

            const [withCat] = await attachCategory([p]);
            return res.json({ success: true, data: withCat });
        }),
    ],

    /** GET /api/products/slug/:slug */
    getProductBySlug: [
        asyncHandler(async (req: Request, res: Response) => {
            const parsed = ProductSlugParamDto.parse(req.params);

            const p = await productStorage.getBySlug(parsed.slug);
            if (!p) throw new AppError(AppErrorCode.NOT_FOUND, 'Product not found', 404);

            const [withCat] = await attachCategory([p]);
            return res.json({ success: true, data: withCat });
        }),
    ],

    /** POST /api/products (ADMIN) - Фронт уже загрузил картинки в Cloudinary, отправляет только метаданные */
    createProduct: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = (req as any).body as z.infer<typeof ProductCreateDto>;

            // Проверяем наличие images
            const bodyImages = (body as any).images;
            if (!Array.isArray(bodyImages) || bodyImages.length === 0) {
                throw new AppError(AppErrorCode.VALIDATION_ERROR, 'At least one image is required', 422);
            }

            // Категория обязательна: categoryId или categorySlug
            const catParsed = CategoryInputDto.parse({
                categoryId: (body as any).categoryId,
                categorySlug: (body as any).categorySlug,
            });
            const categoryId = await resolveCategoryId(catParsed);

            const {
                originalPrice,
                customPv,
                customCashback,

                seoTitle,
                seoDescription,
                seoKeywords,
                howToTake,
                benefits,

                ...rest
            } = body as any;

            const payload = {
                ...(rest as any),
                categoryId,

                images: bodyImages,

                originalPrice: nullifyEmpty(originalPrice),
                customPv: nullifyEmpty(customPv),
                customCashback: nullifyEmpty(customCashback),

                status: (rest as any).status ?? 'draft',
                uiStatus: (rest as any).uiStatus ?? 'active',

                // SEO
                seoTitle: seoTitle?.trim() || body.name,
                seoDescription: seoDescription?.trim() || body.description,
                seoKeywords: seoKeywords ?? null,

                // Доп поля
                howToTake: howToTake ?? null,
                benefits: benefits ?? [],
            };

            try {
                const created = await productStorage.create(payload as any);
                const [withCat] = await attachCategory([created]);

                // ✅ Task 4.3: Инвалидируем кэш продуктов после создания
                // await redisCache.invalidateProducts();

                return res.status(201).json({ success: true, data: withCat });
            } catch (e) {
                if (isPgUniqueError(e)) {
                    const field = uniqueFieldFromError(e);
                    throw new AppError(
                        AppErrorCode.VALIDATION_ERROR,
                        `Duplicate ${field || 'field'}`,
                        409,
                        { field },
                    );
                }
                errorMonitoringService.logError('error', 'Create product error', e as Error);
                throw e;
            }
        }),
    ],

    /** PATCH /api/products/:id (ADMIN) */
    updateProduct: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const idParsed = ProductIdParamDto.parse(req.params);
            const patch = (req as any).body as z.infer<typeof ProductUpdateDto>;

            const clean: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(patch)) {
                if (v !== undefined) clean[k] = v;
            }

            // nullify
            if ('originalPrice' in clean)
                clean['originalPrice'] = nullifyEmpty(clean['originalPrice'] as any);
            if ('customPv' in clean)
                clean['customPv'] = nullifyEmpty(clean['customPv'] as any);
            if ('customCashback' in clean)
                clean['customCashback'] = nullifyEmpty(clean['customCashback'] as any);

            // Категории: id или slug
            if ((clean as any).categoryId || (clean as any).categorySlug) {
                const catParsed = CategoryInputDto.parse({
                    categoryId: (clean as any).categoryId,
                    categorySlug: (clean as any).categorySlug,
                });
                const catId = await resolveCategoryId(catParsed);
                (clean as any).categoryId = catId;
                delete (clean as any).categorySlug;
            }

            try {
                const updated = await productStorage.update(idParsed.id, clean as any);

                // ✅ Task 4.3: Инвалидируем кэш продуктов после обновления
                // await redisCache.invalidateProducts();

                return res.json({ success: true, data: updated });
            } catch (e) {
                if ((e as Error)?.message === 'Product not found') {
                    throw new AppError(AppErrorCode.NOT_FOUND, 'Product not found', 404);
                }

                if (isPgUniqueError(e)) {
                    const field = uniqueFieldFromError(e);
                    throw new AppError(
                        AppErrorCode.VALIDATION_ERROR,
                        `Duplicate ${field || 'field'}`,
                        409,
                        { field },
                    );
                }

                errorMonitoringService.logError('error', 'Update product error', e as Error);
                throw e;
            }
        }),
    ],

    /** DELETE /api/products/:id (ADMIN) */
    deleteProduct: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const parsed = ProductIdParamDto.parse(req.params);

            const ok = await productStorage.delete(parsed.id);
            if (!ok) throw new AppError(AppErrorCode.NOT_FOUND, 'Product not found', 404);

            // ✅ Task 4.3: Инвалидируем кэш продуктов после удаления
            // await redisCache.invalidateProducts();

            return res.json({ success: true, data: { id: parsed.id, deleted: true } });
        }),
    ],

    /* ───────── ЕДИНСТВЕННАЯ категория товара ───────── */

    /** GET /api/products/:id/category — вернуть объект категории или null */
    getProductCategory: [
        asyncHandler(async (req: Request, res: Response) => {
            const { id: productId } = ProductIdParamDto.parse(req.params);

            const rows = await db
                .select({
                    pid: product.id,
                    catId: category.id,
                    catName: category.name,
                    catSlug: category.slug,
                })
                .from(product)
                .leftJoin(category, eq(product.categoryId, category.id))
                .where(eq(product.id, productId))
                .limit(1);

            const row = rows[0];
            const cat: CatDTO | null = row?.catId ? { id: row.catId, name: row.catName!, slug: row.catSlug! } : null;
            return res.json({ success: true, category: cat });
        }),
    ],

    /** PUT /api/products/:id/category (ADMIN) — установить категорию по id или slug */
    setProductCategory: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: productId } = ProductIdParamDto.parse(req.params);
            const body = CategoryInputDto.parse(req.body);
            const catId = await resolveCategoryId(body);

            const [exists] = await db.select({ id: product.id }).from(product).where(eq(product.id, productId)).limit(1);
            if (!exists) throw new AppError(AppErrorCode.NOT_FOUND, 'Product not found', 404);

            await db.update(product).set({ categoryId: catId, updatedAt: new Date() }).where(eq(product.id, productId));

            const [row] = await db
                .select({ id: category.id, name: category.name, slug: category.slug })
                .from(category)
                .where(eq(category.id, catId))
                .limit(1);

            const cat: CatDTO | null = row ? { id: row.id, name: row.name!, slug: row.slug! } : null;
            return res.json({ success: true, category: cat });
        }),
    ],
};
