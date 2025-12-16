// src/storage/blogStorage.ts
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '#db/db';
import { blogPosts, type NewBlogPost } from '#db/schema/blog';
import { uploadedMedia } from '#db/schema';
import { slugifyRu } from '#utils/slugify';
import { toJsonbArraySafe } from './_jsonb';

export interface ListPostsParams {
    status?: 'published' | 'draft';
    categorySlug?: string;
    search?: string;
    limit?: number;
    offset?: number;
    order?: 'newest' | 'oldest';
    withImage?: boolean;
}

export const blogStorage = {
    /** Создание поста */
    async create(data: Omit<NewBlogPost, 'id' | 'createdAt' | 'updatedAt'>) {
        try {
            const url = slugifyRu(data.customUrl ?? data.title);

            const [row] = await db
                .insert(blogPosts)
                .values({
                    title: data.title,
                    excerpt: data.excerpt,
                    author: data.author,
                    publishDate: data.publishDate ?? new Date(),
                    categorySlug: data.categorySlug,
                    customUrl: url,
                    keywords: data.keywords ?? null,
                    status: data.status ?? 'draft',
                    readTime: data.readTime ?? null,
                    images: toJsonbArraySafe(data.images),
                    heroMediaId: data.heroMediaId ?? null,
                    content: data.content ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning();

            return row!;
        } catch (e: any) {
            if (e?.code === '23505') throw new Error('Custom URL уже используется');
            throw e;
        }
    },

    /** Получить по ID */
    async getById(id: string) {
        const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
        return row ?? null;
    },

    /** Получить по customUrl (slug) */
    async getByUrl(customUrl: string) {
        const [row] = await db.select().from(blogPosts).where(eq(blogPosts.customUrl, customUrl)).limit(1);
        return row ?? null;
    },

    /** Список постов */
    async list(params: ListPostsParams = {}) {
        const {
            status,
            categorySlug,
            search,
            limit = 20,
            offset = 0,
            order = 'newest',
            withImage = false,
        } = params;

        const whereParts: any[] = [];
        if (status) whereParts.push(eq(blogPosts.status, status));
        if (categorySlug) whereParts.push(eq(blogPosts.categorySlug, categorySlug));
        if (search?.trim()) {
            const q = `%${search.trim()}%`;
            // ищем по заголовку и краткому описанию
            whereParts.push(ilike(blogPosts.title, q));
            whereParts.push(ilike(blogPosts.excerpt, q));
        }

        const whereClause = whereParts.length ? and(...whereParts) : sql`true`;
        const orderBy = order === 'oldest' ? asc(blogPosts.publishDate) : desc(blogPosts.publishDate);

        if (!withImage) {
            return db
                .select()
                .from(blogPosts)
                .where(whereClause)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset);
        }

        return db
            .select({
                id: blogPosts.id,
                title: blogPosts.title,
                excerpt: blogPosts.excerpt,
                author: blogPosts.author,
                publishDate: blogPosts.publishDate,
                categorySlug: blogPosts.categorySlug,
                customUrl: blogPosts.customUrl,
                status: blogPosts.status,
                readTime: blogPosts.readTime,
                imageId: blogPosts.heroMediaId,
                imageUrl: uploadedMedia.url,
                imageWidth: uploadedMedia.width,
                imageHeight: uploadedMedia.height,
            })
            .from(blogPosts)
            .leftJoin(uploadedMedia, eq(blogPosts.heroMediaId, uploadedMedia.id))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);
    },

    /** Обновление */
    async update(id: string, patch: Partial<Omit<NewBlogPost, 'id'>>) {
        const payload: Partial<NewBlogPost> = {};

        if (patch.title !== undefined) payload.title = patch.title;
        if (patch.excerpt !== undefined) payload.excerpt = patch.excerpt;
        if (patch.author !== undefined) payload.author = patch.author;
        if (patch.publishDate !== undefined) payload.publishDate = patch.publishDate;
        if (patch.categorySlug !== undefined) payload.categorySlug = patch.categorySlug;
        if (patch.customUrl !== undefined) payload.customUrl = slugifyRu(patch.customUrl);
        if (patch.keywords !== undefined) payload.keywords = patch.keywords;
        if (patch.status !== undefined) payload.status = patch.status;
        if (patch.readTime !== undefined) payload.readTime = patch.readTime;
        if (patch.heroMediaId !== undefined) payload.heroMediaId = patch.heroMediaId;
        if (patch.content !== undefined) payload.content = patch.content;

        // images → явная сериализация в JSONB
        const sets: Array<Promise<unknown>> = [];
        payload.updatedAt = new Date();

        // если нет ничего кроме updatedAt — просто вернём запись
        const hasNonMetaChanges =
            Object.keys(payload).some((k) => k !== 'updatedAt') || patch.images !== undefined;
        if (!hasNonMetaChanges) return this.getById(id);

        // основной апдейт (без images)
        const mainPayload = { ...payload } as Partial<NewBlogPost>;
        delete (mainPayload as any).images;

        if (Object.keys(mainPayload).length) {
            sets.push(
                db.update(blogPosts).set(mainPayload).where(eq(blogPosts.id, id)).returning(),
            );
        }

        if (patch.images !== undefined) {
            sets.push(
                db
                    .update(blogPosts)
                    .set({ images: toJsonbArraySafe(patch.images), updatedAt: new Date() })
                    .where(eq(blogPosts.id, id))
                    .returning(),
            );
        }

        await Promise.all(sets);
        return this.getById(id);
    },

    /** Установка hero-изображения */
    async setHeroImage(id: string, heroMediaId: string | null) {
        const [row] = await db
            .update(blogPosts)
            .set({ heroMediaId, updatedAt: new Date() })
            .where(eq(blogPosts.id, id))
            .returning();
        return row ?? null;
    },

    /** Удаление поста */
    async deleteById(id: string) {
        const [row] = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
        return row ?? null;
    },
};
