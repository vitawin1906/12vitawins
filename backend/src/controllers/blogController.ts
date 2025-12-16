// backend/src/controllers/blogController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { blogStorage } from '#storage/blogStorage';

/* ───────────────── Helpers ───────────────── */

const slugRegex = /^[a-z0-9-]+$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function normalizeToIso(input?: string) {
    if (input == null) return undefined;
    const s = input.trim();
    if (!s) return undefined;
    if (YMD.test(s)) return new Date(s + 'T00:00:00Z').toISOString();
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Препроцессор: '' → undefined (чтобы не валиться на пустой строке) */
const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** Разрешаем ISO/`YYYY-MM-DD`/пусто */
const FlexibleDateString = z.preprocess(
    emptyToUndef,
    z
        .string()
        .refine((s) => !!normalizeToIso(s), { message: 'Invalid ISO datetime' })
        .optional(),
);

/* ───────────────── Validation Schemas ───────────────── */

const CreateBlogPostSchema = z.object({
    title: z.string().min(1).max(500),
    excerpt: z.string().min(1),
    author: z.string().min(1).max(200),
    publishDate: FlexibleDateString,                // ← допускаем ISO/YYY-MM-DD/пусто
    categorySlug: z.string().min(1).max(100).optional(), // ← для черновиков можно без категории
    customUrl: z.string().regex(slugRegex).max(500),
    keywords: z.string().optional(),
    status: z.enum(['draft', 'published']).optional(),
    readTime: z.number().int().positive().optional(),
    heroMediaId: z.string().uuid().optional(),
    content: z.string().optional(),
    images: z.array(z.string().url()).max(4).optional(),
});

const UpdateBlogPostSchema = z
    .object({
        title: z.string().min(1).max(500).optional(),
        excerpt: z.string().min(1).optional(),
        author: z.string().min(1).max(200).optional(),
        publishDate: FlexibleDateString,              // ← поле может отсутствовать/быть пустым
        categorySlug: z.string().min(1).max(100).optional(),
        customUrl: z.string().regex(slugRegex).max(500).optional(),
        keywords: z.string().optional(),
        status: z.enum(['draft', 'published']).optional(),
        readTime: z.number().int().positive().optional(),
        heroMediaId: z.string().uuid().optional(),
        content: z.string().optional(),
        images: z.array(z.string().url()).max(4).optional(),
    })
    .partial();

// exactOptionalPropertyTypes: не передаём undefined-поля
const ListPostsSchema = z.object({
    status: z.enum(['draft', 'published']).optional(),
    categorySlug: z.string().min(1).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    order: z.enum(['newest', 'oldest']).optional(),
    withImage: z.coerce.boolean().optional(),
});

const SetHeroImageSchema = z.object({
    heroMediaId: z.string().uuid().nullable(),
});

// вспомогательные схемы для params
const IdParam = z.object({ id: z.string().uuid() });
const UrlOrIdParam = z.object({ urlOrId: z.string().min(1) });

/* ───────────────── Controller ───────────────── */

export const blogController = {
    /* ───────────────── Public Blog Posts ───────────────── */

    /** GET /api/blog — опубликованные посты (PUBLIC) */
    listPublishedPosts: [
        asyncHandler(async (req, res) => {
            const q = ListPostsSchema.parse(req.query);

            const params = {
                status: 'published' as const,
                ...(q.categorySlug !== undefined ? { categorySlug: q.categorySlug } : {}),
                ...(q.search !== undefined ? { search: q.search } : {}),
                ...(q.limit !== undefined ? { limit: q.limit } : {}),
                ...(q.offset !== undefined ? { offset: q.offset } : {}),
                ...(q.order !== undefined ? { order: q.order } : {}),
                ...(q.withImage !== undefined ? { withImage: q.withImage } : {}),
            };

            const posts = await blogStorage.list(params);
            return res.json({ success: true, posts });
        }),
    ],

    /** GET /api/blog/:urlOrId — деталь поста (PUBLIC) */
    getPostByUrlOrId: [
        asyncHandler(async (req: Request, res: Response) => {
            const { urlOrId } = UrlOrIdParam.parse(req.params);

            // Сначала по slug/customUrl
            let post = await blogStorage.getByUrl(urlOrId);

            // Если не нашли — пробуем как UUID
            if (!post) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(urlOrId)) {
                    post = await blogStorage.getById(urlOrId);
                }
            }

            if (!post) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }
            if (post.status !== 'published') {
                throw new AppError(AppErrorCode.FORBIDDEN, 'Blog post not available', 403);
            }

            return res.json({ success: true, post });
        }),
    ],

    /* ───────────────── Admin Blog Posts Management ───────────────── */

    /** GET /api/admin/blog — все посты (ADMIN) */
    listAllPosts: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req, res) => {
            const q = ListPostsSchema.parse(req.query);

            const params = {
                ...(q.categorySlug !== undefined ? { categorySlug: q.categorySlug } : {}),
                ...(q.status !== undefined ? { status: q.status } : {}),
                ...(q.search !== undefined ? { search: q.search } : {}),
                ...(q.limit !== undefined ? { limit: q.limit } : {}),
                ...(q.offset !== undefined ? { offset: q.offset } : {}),
                ...(q.order !== undefined ? { order: q.order } : {}),
                ...(q.withImage !== undefined ? { withImage: q.withImage } : {}),
            };

            const posts = await blogStorage.list(params);
            return res.json({ success: true, posts });
        }),
    ],

    /** GET /api/admin/blog/:id — деталь (ADMIN) */
    getPostById: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: postId } = IdParam.parse(req.params);
            const post = await blogStorage.getById(postId);
            if (!post) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }
            return res.json({ success: true, post });
        }),
    ],

    /** POST /api/admin/blog — создать пост (ADMIN) */
    createPost: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreateBlogPostSchema.parse(req.body);

            const iso = normalizeToIso(body.publishDate);
            const post = await blogStorage.create({
                title: body.title,
                excerpt: body.excerpt,
                author: body.author,
                publishDate: iso ? new Date(iso) : new Date(), // ← если даты нет, ставим now()
                categorySlug: body.categorySlug,
                customUrl: body.customUrl,
                keywords: body.keywords ?? null,
                status: body.status ?? 'draft',
                readTime: body.readTime ?? null,
                heroMediaId: body.heroMediaId ?? null,
                content: body.content ?? null,
                images: body.images ?? [],
            });

            return res.status(201).json({
                success: true,
                message: 'Blog post created successfully',
                post,
            });
        }),
    ],

    /** PUT /api/admin/blog/:id — обновить пост (ADMIN) */
    updatePost: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: postId } = IdParam.parse(req.params);
            const body = UpdateBlogPostSchema.parse(req.body);

            const existing = await blogStorage.getById(postId);
            if (!existing) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }

            const patch: Record<string, unknown> = {
                ...(body.title !== undefined ? { title: body.title } : {}),
                ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
                ...(body.author !== undefined ? { author: body.author } : {}),
                ...(body.categorySlug !== undefined ? { categorySlug: body.categorySlug } : {}),
                ...(body.customUrl !== undefined ? { customUrl: body.customUrl } : {}),
                ...(body.keywords !== undefined ? { keywords: body.keywords } : {}),
                ...(body.status !== undefined ? { status: body.status } : {}),
                ...(body.readTime !== undefined ? { readTime: body.readTime } : {}),
                ...(body.heroMediaId !== undefined ? { heroMediaId: body.heroMediaId } : {}),
                ...(body.content !== undefined ? { content: body.content } : {}),
                ...(body.images !== undefined ? { images: body.images } : {}),
            };

            // КЛЮЧЕВОЕ: publishDate меняем ТОЛЬКО если поле пришло непустым
            if (body.publishDate !== undefined) {
                const iso = normalizeToIso(body.publishDate);
                if (!iso) {
                    throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Invalid ISO datetime', 400);
                }
                (patch as any).publishDate = new Date(iso);
            }

            const updated = await blogStorage.update(postId, patch as any);

            return res.json({
                success: true,
                message: 'Blog post updated successfully',
                post: updated,
            });
        }),
    ],

    /** DELETE /api/admin/blog/:id — удалить пост (ADMIN) */
    deletePost: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: postId } = IdParam.parse(req.params);

            const deleted = await blogStorage.deleteById(postId);
            if (!deleted) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }

            return res.json({ success: true, message: 'Blog post deleted successfully' });
        }),
    ],

    /** PUT /api/admin/blog/:id/hero-image — установить hero (ADMIN) */
    setHeroImage: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: postId } = IdParam.parse(req.params);
            const { heroMediaId } = SetHeroImageSchema.parse(req.body);

            const existing = await blogStorage.getById(postId);
            if (!existing) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }

            const updated = await blogStorage.setHeroImage(postId, heroMediaId);

            return res.json({
                success: true,
                message: 'Hero image updated successfully',
                post: updated,
            });
        }),
    ],

    /** POST /api/admin/blog/:id/publish — опубликовать (ADMIN) */
    publishPost: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: postId } = IdParam.parse(req.params);

            const existing = await blogStorage.getById(postId);
            if (!existing) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }
            if (existing.status === 'published') {
                throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Post is already published', 400);
            }
            if (!existing.categorySlug || !existing.categorySlug.trim()) {
                throw new AppError(AppErrorCode.VALIDATION_ERROR, 'categorySlug is required to publish', 400);
            }

            const updated = await blogStorage.update(postId, {
                status: 'published',
                publishDate: new Date(), // при публикации фиксируем текущее время
            });

            return res.json({
                success: true,
                message: 'Blog post published successfully',
                post: updated,
            });
        }),
    ],

    /** POST /api/admin/blog/:id/unpublish — снять с публикации (ADMIN) */
    unpublishPost: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id: postId } = IdParam.parse(req.params);

            const existing = await blogStorage.getById(postId);
            if (!existing) {
                throw new AppError(AppErrorCode.NOT_FOUND, 'Blog post not found', 404);
            }
            if (existing.status === 'draft') {
                throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Post is already a draft', 400);
            }

            const updated = await blogStorage.update(postId, { status: 'draft' });

            return res.json({
                success: true,
                message: 'Blog post unpublished successfully',
                post: updated,
            });
        }),
    ],
};
