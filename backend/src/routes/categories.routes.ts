// backend/src/routes/categories.routes.ts
import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';

// ---- Drizzle для админ-GET с productCount ----
import { and, or, ilike, eq, asc, desc, sql, getTableColumns } from 'drizzle-orm';
import { db } from '#config/index';
import { category, product } from '../db/schema';
import {CategoryListQuery} from "#db/shemaTypes/category"; // ВАЖНО: берём product, не productCategory

// ───────────────── Public Category Routes ─────────────────
const publicRouter = Router();

publicRouter.get('/:slug', ...categoryController.getCategoryBySlug);
publicRouter.get('/', async (req, res) => {
    const parsed = CategoryListQuery.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_query', details: parsed.error.format() });
    }
    const q = parsed.data;
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;

    // where
    const whereParts = [];
    if (q.q) whereParts.push(or(ilike(category.name, `%${q.q}%`), ilike(category.slug, `%${q.q}%`)));
    if (q.status) whereParts.push(eq(category.status, q.status));
    const whereExpr = whereParts.length ? and(...whereParts) : sql`true`;

    // order
    const orderExpr =
        q.orderBy === 'name_desc' ? desc(category.name)
            : q.orderBy === 'created_desc' ? desc(category.createdAt)
                : q.orderBy === 'created_asc' ? asc(category.createdAt)
                    : asc(category.name);

    // total -> заголовок
    const totalRows = await db.select({ cnt: sql<number>`count(*)` }).from(category).where(whereExpr);
    res.setHeader('X-Total-Count', String(Number(totalRows[0]?.cnt ?? 0)));

    // CTE: считаем продукты по product.categoryId (FK на category.id)
    const pc = db.$with('pc').as(
        db
            .select({
                categoryId: product.categoryId, // у тебя в БД column category_id → в Drizzle скорее всего categoryId
                cnt: sql<number>`count(*)`.as('cnt'),
            })
            .from(product)
            .groupBy(product.categoryId)
    );

    // items + productCount
    const rows = await db
        .with(pc)
        .select({
            ...getTableColumns(category),
            productCount: sql<number>`coalesce(${pc.cnt}, 0)`.as('productCount'),
        })
        .from(category)
        .leftJoin(pc, eq(pc.categoryId, category.id))
        .where(whereExpr)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset);

    const view = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description ?? null,
        status: r.status,
        createdAt: (r.createdAt as Date).toISOString(),
        updatedAt: (r.updatedAt as Date).toISOString(),
        seoTitle: r.seo_title ?? null,
        seoDescription: r.seo_description ?? null,
        productCount: Number(r.productCount ?? 0),
    }));

    return res.json(view);
});

export default publicRouter;

// ───────────────── Admin Routes ─────────────────
export const adminCategoriesRouter = Router();

// create/update/delete — через контроллеры
adminCategoriesRouter.post('/', ...categoryController.createCategory);
adminCategoriesRouter.put('/:id', ...categoryController.updateCategory);
adminCategoriesRouter.delete('/:id', ...categoryController.deleteCategory);

// GET /api/admin/categories — массив + productCount + X-Total-Count
adminCategoriesRouter.get('/', async (req, res) => {
    const parsed = CategoryListQuery.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_query', details: parsed.error.format() });
    }
    const q = parsed.data;
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;

    // where
    const whereParts = [];
    if (q.q) whereParts.push(or(ilike(category.name, `%${q.q}%`), ilike(category.slug, `%${q.q}%`)));
    if (q.status) whereParts.push(eq(category.status, q.status));
    const whereExpr = whereParts.length ? and(...whereParts) : sql`true`;

    // order
    const orderExpr =
        q.orderBy === 'name_desc' ? desc(category.name)
            : q.orderBy === 'created_desc' ? desc(category.createdAt)
                : q.orderBy === 'created_asc' ? asc(category.createdAt)
                    : asc(category.name);

    // total -> заголовок
    const totalRows = await db.select({ cnt: sql<number>`count(*)` }).from(category).where(whereExpr);
    res.setHeader('X-Total-Count', String(Number(totalRows[0]?.cnt ?? 0)));

    // CTE: считаем продукты по product.categoryId (FK на category.id)
    const pc = db.$with('pc').as(
        db
            .select({
                categoryId: product.categoryId, // у тебя в БД column category_id → в Drizzle скорее всего categoryId
                cnt: sql<number>`count(*)`.as('cnt'),
            })
            .from(product)
            .groupBy(product.categoryId)
    );

    // items + productCount
    const rows = await db
        .with(pc)
        .select({
            ...getTableColumns(category),
            productCount: sql<number>`coalesce(${pc.cnt}, 0)`.as('productCount'),
        })
        .from(category)
        .leftJoin(pc, eq(pc.categoryId, category.id))
        .where(whereExpr)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset);

    const view = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description ?? null,
        status: r.status,
        createdAt: (r.createdAt as Date).toISOString(),
        updatedAt: (r.updatedAt as Date).toISOString(),
        seoTitle: r.seo_title ?? null,
        seoDescription: r.seo_description ?? null,
        productCount: Number(r.productCount ?? 0),
    }));

    return res.json(view);
});
