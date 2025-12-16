// src/services/categoriesService.ts
import { and, asc, desc, eq, sql, getTableColumns } from 'drizzle-orm';
import { db } from '#db/db';
import { category as categoryTable } from '#db/schema/categories';
import { product } from '#db/schema/products';

import { must, slugify } from '../utils/storageHelpers';

// Типы
type CategoryRow = typeof categoryTable.$inferSelect;
type NewCategoryRow = typeof categoryTable.$inferInsert;

// Входные типы
type BaseCreateCategory = Omit<
    NewCategoryRow,
    'id' | 'createdAt' | 'updatedAt' | 'slug'
>;

export type CreateCategoryInput = BaseCreateCategory & {
    slug?: string;
};

export type UpdateCategoryPatch = Partial<BaseCreateCategory> & {
    slug?: string;
};

export type ListCategoriesParams = {
    q?: string;
    orderBy?: 'createdAt' | 'name';
    orderDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
};

// ───────────────────────── helpers ─────────────────────────

function buildWhere(p: ListCategoriesParams) {
    const conds: any[] = [];
    if (p.q && p.q.trim()) {
        const term = `%${p.q.trim()}%`;
        conds.push(
            sql`(${categoryTable.name} ILIKE ${term} OR ${categoryTable.slug} ILIKE ${term})`
        );
    }
    return conds.length ? and(...conds) : undefined;
}

function buildOrder(p: ListCategoriesParams) {
    const dir = (p.orderDir ?? 'desc') === 'asc' ? asc : desc;
    switch (p.orderBy) {
        case 'name':
            return [dir(categoryTable.name)];
        default:
            return [dir(categoryTable.createdAt)];
    }
}

// ───────────────────────── Service ─────────────────────────

export const categoriesService = {
    /** Создать категорию */
    async create(input: CreateCategoryInput): Promise<CategoryRow> {
        if (!input.name?.trim()) {
            throw new Error('Category name is required');
        }

        const { slug, ...rest } = input;

        const [created] = await db
            .insert(categoryTable)
            .values({
                ...(rest as NewCategoryRow),
                slug: slug ? slugify(slug) : slugify(input.name),
            })
            .returning();

        return must(created, 'Failed to create category');
    },

    /** Частичное обновление */
    async update(id: string, patch: UpdateCategoryPatch): Promise<CategoryRow> {
        const { slug, ...rest } = patch;

        const setObj: Partial<NewCategoryRow> = { ...(rest as any) };

        if (slug !== undefined) {
            const s = slug.trim();
            if (s) setObj.slug = slugify(s);
        }

        if (Object.keys(setObj).length === 0) {
            const [existing] = await db.select().from(categoryTable).where(eq(categoryTable.id, id));
            return must(existing, 'Category not found');
        }

        const [updated] = await db
            .update(categoryTable)
            .set(setObj)
            .where(eq(categoryTable.id, id))
            .returning();

        return must(updated, 'Category not found after update');
    },

    /** Удалить категорию */
    /** Удалить категорию */
    async delete(id: string): Promise<boolean> {
        const existProducts = await db
            .select({ id: product.id })
            .from(product)
            .where(eq(product.categoryId, id))
            .limit(1);

        if (existProducts.length > 0) {
            throw new Error('Cannot delete category — products assigned');
        }

        const res = await db
            .delete(categoryTable)
            .where(eq(categoryTable.id, id))
            .returning({ id: categoryTable.id });

        return res.length > 0;
    },

    async getById(id: string): Promise<CategoryRow | null> {
        const [row] = await db.select().from(categoryTable).where(eq(categoryTable.id, id));
        return row ?? null;
    },

    async getBySlug(slug: string): Promise<CategoryRow | null> {
        const [row] = await db
            .select()
            .from(categoryTable)
            .where(eq(categoryTable.slug, slug))
            .limit(1);

        return row ?? null;
    },

    /** Список категорий + количество продуктов */
    async listWithProductCount(
        params: ListCategoriesParams = {}
    ): Promise<(CategoryRow & { productCount: number })[]> {
        const { limit = 50, offset = 0 } = params;

        const where = buildWhere(params);
        const order = buildOrder(params);

        const pc = db.$with('pc').as(
            db
                .select({
                    categoryId: product.categoryId,
                    cnt: sql<number>`count(*)`.as('cnt'),
                })
                .from(product)
                .groupBy(product.categoryId)
        );

        const rows = await db
            .with(pc)
            .select({
                ...getTableColumns(categoryTable),
                productCount: sql<number>`coalesce(${pc.cnt}, 0)`.as('productCount'),
            })
            .from(categoryTable)
            .leftJoin(pc, eq(pc.categoryId, categoryTable.id))
            .where(where ?? sql`true`)
            .orderBy(...order)
            .limit(limit)
            .offset(offset);

        return rows as any;
    },

    async getByIdWithProductCount(id: string) {
        const pc = db.$with('pc').as(
            db
                .select({
                    categoryId: product.categoryId,
                    cnt: sql<number>`count(*)`.as('cnt'),
                })
                .from(product)
                .groupBy(product.categoryId)
        );

        const [row] = await db
            .with(pc)
            .select({
                ...getTableColumns(categoryTable),
                productCount: sql<number>`coalesce(${pc.cnt}, 0)`.as('productCount'),
            })
            .from(categoryTable)
            .leftJoin(pc, eq(pc.categoryId, categoryTable.id))
            .where(eq(categoryTable.id, id));

        return row ?? null;
    },

    async getBySlugWithProductCount(slug: string) {
        const pc = db.$with('pc').as(
            db
                .select({
                    categoryId: product.categoryId,
                    cnt: sql<number>`count(*)`.as('cnt'),
                })
                .from(product)
                .groupBy(product.categoryId)
        );

        const [row] = await db
            .with(pc)
            .select({
                ...getTableColumns(categoryTable),
                productCount: sql<number>`coalesce(${pc.cnt}, 0)`.as('productCount'),
            })
            .from(categoryTable)
            .leftJoin(pc, eq(pc.categoryId, categoryTable.id))
            .where(eq(categoryTable.slug, slug))
            .limit(1);

        return row ?? null;
    },
};
