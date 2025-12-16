// src/storage/productStorage.ts
import {
    and, asc, desc, eq, gte, ilike, lte, or, sql, gt, inArray,
} from 'drizzle-orm';
import { db } from '#db/db';

// Таблицы
import { product as productTable } from '#db/schema/products';
import { category } from '#db/schema/categories';

// Контракты (enum-модели для фильтров) — опционально, если используешь в UI
import {
    ProductStatus as ProductStatusEnum,
    UiStatus as UiStatusEnum,
} from '../db/shemaTypes/enumsType';

// Валидация изображений (канон JSONB-структуры)

// Типы строк таблицы
type ProductRow = typeof productTable.$inferSelect;
type NewProductRow = typeof productTable.$inferInsert;

// ─────────────────────────── helpers ───────────────────────────

import { must, toPgMoney, normalizeCashbackPercent } from '../utils/storageHelpers';

/** Подготовка JSONB изображений с валидацией по канону */
import { toJsonbArraySafe } from './_jsonb';
import {ProductImagesNonEmpty} from "#db/shemaTypes/productImagesTypes";
function toJsonbImagesOrThrow(items: unknown): ReturnType<typeof sql> {
    const validated = ProductImagesNonEmpty.parse(items);
    return toJsonbArraySafe(validated);
}

// Для фильтров из контрактов (если используешь их значения)
const PRODUCT_STATUS_SET = new Set(ProductStatusEnum.options);
const UI_STATUS_SET = new Set(UiStatusEnum.options);
function isProductStatus(v: unknown): v is (typeof ProductStatusEnum)['options'][number] {
    return PRODUCT_STATUS_SET.has(v as any);
}
function isUiStatus(v: unknown): v is (typeof UiStatusEnum)['options'][number] {
    return UI_STATUS_SET.has(v as any);
}

// ─────────────────────────── публичные типы API ───────────────────────────

/**
 * Поля создания продукта.
 * Исключаем техн. поля (id/createdAt/updatedAt) и «служебные»
 * которые мы нормализуем тут: slug, images(JSONB), customCashback(проценты).
 * ВАЖНО: теперь требуем ровно один parent — categoryId.
 */
type BaseCreateProduct = Omit<
    NewProductRow,
    'id' | 'createdAt' | 'updatedAt' | 'slug' | 'images' | 'customCashback'
>;

export type CreateProductInput = Omit<BaseCreateProduct, 'price'> & {
    price: number | string;      // NUMERIC(12,2)
    slug?: string;
    images: unknown[];           // массив объектов по канону → валидируется
    /** ПРОЦЕНТЫ (0..100). Можно передать 0..1 — нормализуем в проценты. */
    customCashback?: number | null;
    /** ЕДИНСТВЕННАЯ категория (обязательная) */
    categoryId: string;
    /** alias для snake-полей */
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | null;
    howToTake?: string | null;
    benefits?: string[] | null;
};

export type UpdateProductPatch = Partial<
    Omit<BaseCreateProduct, 'price'>
> & {
    price?: number | string;
    slug?: string;
    images?: unknown[];              // валидируем при замене
    /** ПРОЦЕНТЫ (0..100). Можно передать 0..1 — нормализуем в проценты. */
    customCashback?: number | null;
    /** смена единственной категории */
    categoryId?: string;
    /** alias для snake-полей */
    seoTitle?: string | null;
    seoDescription?: string | null;
};

export type ListProductsParams = {
    q?: string;
    status?: (typeof ProductStatusEnum)['options'][number];
    uiStatus?: (typeof UiStatusEnum)['options'][number];
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    /** фильтр по категории */
    categoryId?: string;
    orderBy?: 'createdAt' | 'price' | 'name';
    orderDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
};

// ─────────────────────────── фильтры/сортировки ───────────────────────────

function buildWhere(p: ListProductsParams) {
    const conds: any[] = [];

    if (p.q && p.q.trim()) {
        const term = `%${p.q.trim()}%`;
        conds.push(
            or(
                ilike(productTable.name, term),
                ilike(productTable.slug, term),
                ilike(productTable.description, term),
                ilike(productTable.longDescription, term),
                ilike(productTable.manufacturer, term),
                ilike(productTable.usage, term),
                ilike(productTable.additionalInfo, term),
                ilike(productTable.sku, term),
            ),
        );
    }

    if (typeof p.inStock === 'boolean') {
        conds.push(p.inStock ? gt(productTable.stock, 0) : eq(productTable.stock, 0));
    }

    if (p.status && isProductStatus(p.status)) conds.push(eq(productTable.status, p.status as any));
    if (p.uiStatus && isUiStatus(p.uiStatus)) conds.push(eq(productTable.uiStatus, p.uiStatus as any));

    if (typeof p.minPrice === 'number') conds.push(gte(productTable.price, String(p.minPrice)));
    if (typeof p.maxPrice === 'number') conds.push(lte(productTable.price, String(p.maxPrice)));

    if (p.categoryId) conds.push(eq(productTable.categoryId, p.categoryId));

    return conds.length ? and(...conds) : undefined;
}

function buildOrder(p: ListProductsParams) {
    const dir = (p.orderDir ?? 'desc') === 'asc' ? asc : desc;
    switch (p.orderBy) {
        case 'price': return [dir(productTable.price)];
        case 'name':  return [dir(productTable.name)];
        default:      return [dir(productTable.createdAt)];
    }
}

// ─────────────────────────── инварианты ───────────────────────────

function assertCreateInvariants(input: CreateProductInput) {
    if (!input.name || input.name.trim().length < 1) throw new Error('Product name is required');
    if (!Array.isArray(input.images) || input.images.length === 0)
        throw new Error('Product must have at least one image');
    if (!input.categoryId) throw new Error('categoryId is required');
}

function assertUpdateInvariants(patch: UpdateProductPatch) {
    if (patch.images && patch.images.length === 0)
        throw new Error('Product cannot be left without images');
}

// ─────────────────────────── helpers (join category) ───────────────────────────

async function fetchCategoryNamesMapByProductIds(ids: string[]) {
    if (!ids.length) return new Map<string, string[]>();
    const rows = await db
        .select({
            productId: productTable.id,
            name: category.name,
        })
        .from(productTable)
        .leftJoin(category, eq(productTable.categoryId, category.id))
        .where(inArray(productTable.id, ids));

    const map = new Map<string, string[]>();
    for (const r of rows) {
        map.set(r.productId, r.name ? [r.name] : []);
    }
    return map;
}

// ─────────────────────────── Storage API ───────────────────────────

export const productStorage = {
    /** Создать продукт */
    /** Создать продукт */
    async create(input: CreateProductInput): Promise<ProductRow> {
        assertCreateInvariants(input);

        const {
            slug,
            images,
            customCashback,
            categoryId,
            seoTitle,
            seoDescription,
            seoKeywords,
            howToTake,
            benefits,
            price,
            ...rest
        } = input;

        const jsonbImages = toJsonbImagesOrThrow(images);
        const cashbackPercent = normalizeCashbackPercent(customCashback);

        const [created] = await db
            .insert(productTable)
            .values({
                ...(rest as BaseCreateProduct),
                categoryId,

                // SEO → snake_case
                seo_title: seoTitle ?? null,
                seo_description: seoDescription ?? null,
                seo_keywords: seoKeywords ?? null,

                // Доп поля
                how_to_take: howToTake ?? null,
                benefits: benefits ?? [],

                // slug
                slug: (slug ?? input.name)
                    .trim()
                    .toLowerCase()
                    .replace(/[^\p{L}\p{N}]+/gu, '-')
                    .replace(/^-+|-+$/g, ''),

                // money / rates
                price: toPgMoney(price)!,
                customCashback: cashbackPercent == null ? null : String(cashbackPercent),

                // images JSONB
                images: jsonbImages,
            } as unknown as NewProductRow)
            .returning();

        return must(created, 'Failed to create product');
    },
    /** Обновить продукт (частично) */
    async update(id: string, patch: UpdateProductPatch): Promise<ProductRow> {
        assertUpdateInvariants(patch);

        const {
            slug,
            images,
            customCashback,
            categoryId,
            seoTitle,
            seoDescription,
            seoKeywords,
            howToTake,
            benefits,
            price,
            ...rest
        } = patch;

        const setObj: Partial<NewProductRow> = {
            ...(rest as Partial<NewProductRow>),
        };

        if (categoryId !== undefined) setObj.categoryId = categoryId;

        if (slug !== undefined) {
            const s = slug.trim();
            if (s) {
                setObj.slug = s
                    .toLowerCase()
                    .replace(/[^\p{L}\p{N}]+/gu, '-')
                    .replace(/^-+|-+$/g, '');
            }
        }

        // SEO → snake_case
        if (seoTitle !== undefined) setObj.seo_title = seoTitle ?? null;
        if (seoDescription !== undefined) setObj.seo_description = seoDescription ?? null;
        if (seoKeywords !== undefined) setObj.seoKeywords = seoKeywords ?? null;

        // Доп поля
        if (howToTake !== undefined) setObj.howToTake = howToTake ?? null;
        if (benefits !== undefined) setObj.benefits = benefits ?? [];

        if (price !== undefined) setObj.price = toPgMoney(price)!;

        if (customCashback !== undefined) {
            const pct = normalizeCashbackPercent(customCashback);
            setObj.customCashback = pct == null ? null : String(pct);
        }

        const sets: any[] = [];

        if (Object.keys(setObj).length > 0) {
            sets.push(
                db.update(productTable)
                    .set(setObj)
                    .where(eq(productTable.id, id)),
            );
        }

        if (images !== undefined) {
            const jsonbImages = toJsonbImagesOrThrow(images);
            sets.push(
                db.update(productTable)
                    .set({ images: jsonbImages })
                    .where(eq(productTable.id, id)),
            );
        }

        if (sets.length === 0) {
            const [existing] = await db
                .select()
                .from(productTable)
                .where(eq(productTable.id, id))
                .limit(1);

            return must(existing, 'Product not found');
        }

        await Promise.all(sets);

        const [updated] = await db
            .select()
            .from(productTable)
            .where(eq(productTable.id, id))
            .limit(1);

        return must(updated, 'Product not found after update');
    },

    /** Удалить продукт */
    async delete(id: string): Promise<boolean> {
        const res = await db.delete(productTable).where(eq(productTable.id, id)).returning({ id: productTable.id });
        return res.length > 0;
    },

    /** Получить по id */
    async getById(id: string): Promise<ProductRow | null> {
        const [row] = await db.select().from(productTable).where(eq(productTable.id, id)).limit(1);
        return row ?? null;
    },

    /** Получить по slug */
    async getBySlug(slug: string): Promise<ProductRow | null> {
        const [row] = await db.select().from(productTable).where(eq(productTable.slug, slug)).limit(1);
        return row ?? null;
    },

    /** Список продуктов с фильтрами/сортировкой */
    async list(params: ListProductsParams = {}): Promise<ProductRow[]> {
        const { limit = 20, offset = 0 } = params;
        const where = buildWhere(params);
        const order = buildOrder(params);

        return db
            .select()
            .from(productTable)
            .where(where ?? sql`true`)
            .orderBy(...order)
            .limit(limit)
            .offset(offset);
    },

    /**
     * Список + названия категорий (для обратной совместимости оставляем plural-API).
     * Теперь у продукта максимум одно имя категории → массив длиной 0 или 1.
     */
    async listWithCategories(params: ListProductsParams = {}): Promise<(ProductRow & { categories: string[] })[]> {
        const rows = await this.list(params);
        const ids = rows.map(r => r.id);
        const cmap = await fetchCategoryNamesMapByProductIds(ids);
        return rows.map(r => ({ ...r, categories: cmap.get(r.id) ?? [] }));
    },

    /** Продукт по id + названия категорий (0 или 1 элемент) */
    async getByIdWithCategories(id: string): Promise<(ProductRow & { categories: string[] }) | null> {
        const row = await this.getById(id);
        if (!row) return null;
        const cmap = await fetchCategoryNamesMapByProductIds([row.id]);
        return { ...row, categories: cmap.get(row.id) ?? [] };
    },

    /** Продукт по slug + названия категорий (0 или 1 элемент) */
    async getBySlugWithCategories(slug: string): Promise<(ProductRow & { categories: string[] }) | null> {
        const row = await this.getBySlug(slug);
        if (!row) return null;
        const cmap = await fetchCategoryNamesMapByProductIds([row.id]);
        return { ...row, categories: cmap.get(row.id) ?? [] };
    },

    /**
     * ✅ Проверить наличие товара на складе с блокировкой строки (SELECT FOR UPDATE)
     * Используется при добавлении товара в корзину для предотвращения race condition
     * @returns { id, stock, name } или null если товар не найден
     */
    async checkStockWithLock(
        productId: string,
        requestedQty: number,
        tx = db
    ): Promise<{ id: string; stock: number; name: string } | null> {
        const [product] = await tx
            .select({
                id: productTable.id,
                stock: productTable.stock,
                name: productTable.name,
            })
            .from(productTable)
            .where(eq(productTable.id, productId))
            .for('update'); // SELECT FOR UPDATE - блокирует строку до конца транзакции

        if (!product) return null;

        // Проверка достаточности стока
        if (product.stock < requestedQty) {
            throw new Error(
                `Недостаточно товара "${product.name}" на складе. Доступно: ${product.stock}, запрошено: ${requestedQty}`
            );
        }

        return product;
    },

    /**
     * ✅ Зарезервировать товар (уменьшить stock)
     * Используется при добавлении товара в корзину
     * ВАЖНО: вызывать только внутри транзакции после checkStockWithLock
     */
    async reserveStock(productId: string, qty: number, tx = db): Promise<void> {
        await tx
            .update(productTable)
            .set({
                stock: sql`${productTable.stock} - ${qty}`,
                updatedAt: new Date(),
            })
            .where(eq(productTable.id, productId));
    },

    /**
     * ✅ Освободить резерв товара (увеличить stock)
     * Используется при удалении товара из корзины или отмене заказа
     */
    async releaseStock(productId: string, qty: number, tx = db): Promise<void> {
        await tx
            .update(productTable)
            .set({
                stock: sql`${productTable.stock} + ${qty}`,
                updatedAt: new Date(),
            })
            .where(eq(productTable.id, productId));
    },
};
