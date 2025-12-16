// src/services/blogService.ts
import { z } from 'zod';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '#db/db';
import { blogPosts as blogTable } from '#db/schema/blog';
import { uploadedMedia } from '#db/schema/media';
import { toJsonbArraySafe } from '#storage/_jsonb';

/* ───────── types ───────── */

type BlogRow = typeof blogTable.$inferSelect;
type NewBlogRow = typeof blogTable.$inferInsert;

export type CreateBlogInput = Omit<
    NewBlogRow,
    'id' | 'createdAt' | 'updatedAt' | 'customUrl' | 'images'
> & {
    /** Slug поста (URL-путь). Если не задан — генерируется из title. */
    customUrl?: string;
    /** Массив абсолютных URL изображений (JSONB). */
    images?: string[];
};

export type UpdateBlogPatch = Partial<
    Omit<NewBlogRow, 'id' | 'createdAt' | 'updatedAt' | 'customUrl' | 'images'>
> & {
    customUrl?: string;
    images?: string[]; // полная замена
};

export type ListBlogParams = {
    q?: string;                           // поиск по title/excerpt/author/keywords/customUrl
    status?: BlogRow['status'];           // 'published' | 'draft'
    category?: string | string[];         // slug или массив
    author?: string;
    dateFrom?: Date;                      // publishDate >=
    dateTo?: Date;                        // publishDate <=
    publishedOnly?: boolean;              // status='published' и publishDate<=now
    orderBy?: 'publishDate' | 'createdAt' | 'title';
    orderDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
};

/* ───────── helpers ───────── */

function must<T>(v: T | null | undefined, msg = 'Not found'): asserts v is NonNullable<T> {
    if (v == null) throw new Error(msg);
}

import { slugify } from '../utils/storageHelpers';

const ImagesArray = z.array(z.string().url()).max(32);

function normalizeImages(arr: string[] | undefined) {
    if (!arr) return [] as string[];
    return ImagesArray.parse(arr);
}

function buildWhere(p: ListBlogParams) {
    const conds: any[] = [];

    if (p.q && p.q.trim()) {
        const term = `%${p.q.trim()}%`;
        conds.push(
            or(
                ilike(blogTable.title, term),
                ilike(blogTable.excerpt, term),
                ilike(blogTable.author, term),
                ilike(blogTable.keywords, term),
                ilike(blogTable.customUrl, term),
            ),
        );
    }

    if (p.status) conds.push(eq(blogTable.status, p.status));
    if (p.author) conds.push(ilike(blogTable.author, `%${p.author}%`));

    if (p.category != null) {
        const raw = Array.isArray(p.category) ? p.category : [p.category];
        const cats = raw
            .map((s) => (s ?? '').toString().trim())
            .filter(Boolean)
            .map((s) => slugify(s));

        if (cats.length === 1) {
            const only = cats[0];
            if (only !== undefined) conds.push(eq(blogTable.categorySlug, only));
        } else if (cats.length > 1) {
            conds.push(inArray(blogTable.categorySlug, cats));
        }
    }

    if (p.dateFrom) conds.push(gte(blogTable.publishDate, p.dateFrom));
    if (p.dateTo) conds.push(lte(blogTable.publishDate, p.dateTo));

    if (p.publishedOnly) {
        conds.push(eq(blogTable.status, 'published' as BlogRow['status']));
        conds.push(lte(blogTable.publishDate, new Date()));
    }

    return conds.length ? and(...conds) : undefined;
}

function buildOrder(p: ListBlogParams) {
    const dir = (p.orderDir ?? 'desc') === 'asc' ? asc : desc;
    switch (p.orderBy) {
        case 'title':     return [dir(blogTable.title)];
        case 'createdAt': return [dir(blogTable.createdAt)];
        default:          return [dir(blogTable.publishDate)];
    }
}

/* ───────── Cloudinary payload (для hero) ───────── */

const CloudinaryPayload = z.object({
    public_id: z.string(),
    secure_url: z.string().url().optional(),
    url: z.string().url().optional(),
    format: z.string().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    bytes: z.number().int().optional(),
});

/* ───────── invariants ───────── */

function assertCreateInvariants(input: CreateBlogInput) {
    if (!input.title || !input.title.trim()) throw new Error('Title is required');
    if (!input.excerpt || !input.excerpt.trim()) throw new Error('Excerpt is required');
    if (!input.author || !input.author.trim()) throw new Error('Author is required');
    if (!input.publishDate) throw new Error('publishDate is required');
    if (!input.categorySlug || !input.categorySlug.trim()) throw new Error('categorySlug is required');
    if (!input.status) throw new Error('status is required');
}

function assertUpdateInvariants(_patch: UpdateBlogPatch) {
    // точка расширения
}

/* ───────── service ───────── */

export const blogService = {
    /** Создать пост. */
    async create(input: CreateBlogInput): Promise<BlogRow> {
        assertCreateInvariants(input);

        const { customUrl, images, categorySlug, ...rest } = input;

        const normalizedImages = normalizeImages(images);
        const url = slugify(customUrl ?? input.title);
        const cat = slugify(categorySlug as string);

        const [created] = await db
            .insert(blogTable)
            .values({
                ...(rest as Omit<NewBlogRow, 'customUrl' | 'images' | 'categorySlug'>),
                customUrl: url,
                categorySlug: cat,
                images: toJsonbArraySafe(normalizedImages),
            } as unknown as NewBlogRow)
            .returning();

        must(created, 'Failed to create blog post');
        return created;
    },

    /** Частичное обновление поста (единым апдейтом + updatedAt). */
    async update(id: string, patch: UpdateBlogPatch): Promise<BlogRow> {
        assertUpdateInvariants(patch);

        const { customUrl, images, categorySlug, ...rest } = patch;

        const setObj: Partial<NewBlogRow> = {
            ...(rest as Partial<NewBlogRow>),
            updatedAt: new Date(),
        };

        if (customUrl !== undefined) {
            const s = customUrl.trim();
            if (s) setObj.customUrl = slugify(s);
        }
        if (categorySlug) {
            const s = categorySlug.trim();
            if (s) setObj.categorySlug = slugify(s);
        }
        if (images !== undefined) {
            setObj.images = toJsonbArraySafe(normalizeImages(images)) as any;
        }

        // Если менять нечего (кроме updatedAt), вернём текущую строку без апдейта
        const onlyTimestamp = Object.keys(setObj).every((k) => k === 'updatedAt');
        if (onlyTimestamp) {
            const [existing] = await db.select().from(blogTable).where(eq(blogTable.id, id)).limit(1);
            must(existing, 'Blog post not found');
            return existing;
        }

        const [updated] = await db
            .update(blogTable)
            .set(setObj)
            .where(eq(blogTable.id, id))
            .returning();

        must(updated, 'Blog post not found after update');
        return updated;
    },

    /** Удалить пост. */
    async delete(id: string): Promise<boolean> {
        const res = await db.delete(blogTable).where(eq(blogTable.id, id)).returning({ id: blogTable.id });
        return res.length > 0;
    },

    /** Получить по id. */
    async getById(id: string): Promise<BlogRow | null> {
        const [row] = await db.select().from(blogTable).where(eq(blogTable.id, id)).limit(1);
        return row ?? null;
    },

    /** Получить по customUrl. */
    async getByUrl(customUrl: string): Promise<BlogRow | null> {
        const [row] = await db
            .select()
            .from(blogTable)
            .where(eq(blogTable.customUrl, slugify(customUrl)))
            .limit(1);
        return row ?? null;
    },

    /** Список постов с фильтрами/сортировкой. */
    async list(params: ListBlogParams = {}): Promise<BlogRow[]> {
        const { limit = 20, offset = 0 } = params;
        const where = buildWhere(params);
        const order = buildOrder(params);

        return db
            .select()
            .from(blogTable)
            .where(where ?? sql`true`)
            .orderBy(...order)
            .limit(limit)
            .offset(offset);
    },

    /** Публичный список (только опубликованные к текущему моменту). */
    async listPublic(params: Omit<ListBlogParams, 'publishedOnly'> = {}): Promise<BlogRow[]> {
        return this.list({ ...params, publishedOnly: true });
    },

    /** Публичное получение по URL (published & publishDate<=now). */
    async getPublicByUrl(customUrl: string): Promise<BlogRow | null> {
        const now = new Date();
        const [row] = await db
            .select()
            .from(blogTable)
            .where(and(
                eq(blogTable.customUrl, slugify(customUrl)),
                eq(blogTable.status, 'published' as BlogRow['status']),
                lte(blogTable.publishDate, now),
            ))
            .limit(1);
        return row ?? null;
    },

    // ───────── управление hero (CDN/Cloudinary) ─────────

    /** Установить hero из Cloudinary payload (upsert в uploaded_media, затем heroMediaId у поста). */
    async setHeroFromCloudinary(postId: string, payload: unknown) {
        const p = CloudinaryPayload.parse(payload);
        const url = p.secure_url ?? p.url;
        if (!url) throw new Error('Cloudinary payload must contain url or secure_url');

        const [exists] = await db
            .select()
            .from(uploadedMedia)
            .where(eq(uploadedMedia.publicId, p.public_id))
            .limit(1);

        let mediaId: string;
        if (exists) {
            mediaId = exists.id;
        } else {
            const [ins] = await db
                .insert(uploadedMedia)
                .values({
                    publicId: p.public_id,
                    url,
                    format: p.format ?? null,
                    width: p.width ?? null,
                    height: p.height ?? null,
                    bytes: p.bytes ?? null,
                    meta: null,
                })
                .returning({ id: uploadedMedia.id });
            must(ins, 'Failed to upsert uploaded media');
            mediaId = ins.id;
        }

        const [updated] = await db
            .update(blogTable)
            .set({ heroMediaId: mediaId, updatedAt: new Date() })
            .where(eq(blogTable.id, postId))
            .returning();
        must(updated, 'Blog post not found');
        return updated;
    },

    /** Установить hero по существующему uploaded_media.id (проверим наличие). */
    async setHeroByMediaId(postId: string, mediaId: string) {
        const [m] = await db
            .select({ id: uploadedMedia.id })
            .from(uploadedMedia)
            .where(eq(uploadedMedia.id, mediaId))
            .limit(1);
        must(m, 'Uploaded media not found');

        const [updated] = await db
            .update(blogTable)
            .set({ heroMediaId: mediaId, updatedAt: new Date() })
            .where(eq(blogTable.id, postId))
            .returning();
        must(updated, 'Blog post not found');
        return updated;
    },

    /** Удалить hero (SET NULL). */
    async clearHero(postId: string) {
        const [updated] = await db
            .update(blogTable)
            .set({ heroMediaId: null, updatedAt: new Date() })
            .where(eq(blogTable.id, postId))
            .returning();
        must(updated, 'Blog post not found');
        return updated;
    },
};
