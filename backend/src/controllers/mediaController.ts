// backend/src/controllers/mediaController.ts
import type { Request, Response} from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { mediaStorage } from '#storage/mediaStorage';

/* ───────────────── Validation Schemas ───────────────── */

const ListMediaQuery = z.object({
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    orderBy: z.enum(['createdAt', 'publicId', 'url']).default('createdAt'),
    orderDir: z.enum(['asc', 'desc']).default('desc'),
});

// Allowed image formats
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_WIDTH = 4000;
const MAX_IMAGE_HEIGHT = 4000;

const AttachImageSchema = z.object({
    productId: z.string().uuid(),
    url: z.string().url(),
    cloudinaryPublicId: z.string(),
    format: z.string().refine(
        (fmt) => ALLOWED_IMAGE_FORMATS.includes(fmt.toLowerCase() as any),
        { message: `Format must be one of: ${ALLOWED_IMAGE_FORMATS.join(', ')}` }
    ).optional(),
    width: z.number().int().max(MAX_IMAGE_WIDTH, `Width must not exceed ${MAX_IMAGE_WIDTH}px`).optional(),
    height: z.number().int().max(MAX_IMAGE_HEIGHT, `Height must not exceed ${MAX_IMAGE_HEIGHT}px`).optional(),
    bytes: z.number().int().max(MAX_IMAGE_SIZE_BYTES, `File size must not exceed ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`).optional(),
    altText: z.string().optional(),
    role: z.enum(['main', 'gallery']).default('gallery'),
    sortOrder: z.number().int().min(0).optional(),
});

const ReorderImagesSchema = z.object({
    productId: z.string().uuid(),
    order: z.array(
        z.object({
            mediaId: z.string().uuid(),
            sortOrder: z.number().int().min(0),
        }),
    ),
});

const UpdateImageRoleSchema = z.object({
    productId: z.string().uuid(),
    mediaId: z.string().uuid(),
    role: z.enum(['main', 'gallery']),
});

const UpdateImageAltSchema = z.object({
    productId: z.string().uuid(),
    mediaId: z.string().uuid(),
    altText: z.string(),
});

/* ───────────────── Media Controller ───────────────── */

export const mediaController = {
    /* ───────── Management (registry, stats) ───────── */

    /** GET /api/media (ADMIN) */
    listMedia: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const q = ListMediaQuery.parse(req.query);

            const params: {
                q?: string;
                limit: number;
                offset: number;
                orderBy: 'createdAt' | 'publicId' | 'url';
                orderDir: 'asc' | 'desc';
            } = {
                limit: q.limit,
                offset: q.offset,
                orderBy: q.orderBy,
                orderDir: q.orderDir,
            };
            if (q.q !== undefined) params.q = q.q;

            const result = await mediaStorage.listUploadedImages(params);

            return res.json({
                success: true,
                items: result.items,
                pagination: { limit: q.limit, offset: q.offset, total: result.total },
            });
        }),
    ],

    /** GET /api/media/stats (ADMIN) */
    getMediaStats: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, res: Response) => {
            const stats = await mediaStorage.getMediaStats();
            return res.json({ success: true, stats });
        }),
    ],

    /** DELETE /api/media/:id (ADMIN) */
    deleteMedia: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
            const deleted = await mediaStorage.deleteUploadedImageById(id);
            if (!deleted) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Image is still in use or not found',
                    400,
                );
            }
            return res.json({ success: true, message: 'Image deleted successfully' });
        }),
    ],

    /** GET /api/media/orphaned (ADMIN) */
    listOrphanedMedia: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const limit = req.query.limit ? Number(req.query.limit) : 100;
            const orphaned = await mediaStorage.listOrphanedMedia(limit);
            return res.json({
                success: true,
                orphaned: orphaned.map((m) => ({
                    id: m.id,
                    url: m.url,
                    publicId: m.publicId,
                    createdAt: m.createdAt,
                })),
            });
        }),
    ],

    /** POST /api/media/cleanup (ADMIN) */
    cleanupOrphanedMedia: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const limit = req.body?.limit ? Number(req.body.limit) : 50;
            const deletedCount = await mediaStorage.deleteOrphanedMedia(limit);
            return res.json({
                success: true,
                message: `Deleted ${deletedCount} orphaned images`,
                deletedCount,
            });
        }),
    ],

    /* ───────── Product Images ───────── */

    /** GET /api/products/:productId/images (PUBLIC) */
    listProductImages: [
        asyncHandler(async (req: Request, res: Response) => {
            const { productId } = z.object({ productId: z.string().uuid() }).parse(req.params);
            const images = await mediaStorage.listProductImages(productId);
            return res.json({ success: true, images });
        }),
    ],

    /** POST /api/products/:productId/images (ADMIN) */
    attachImageToProduct: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { productId } = z.object({ productId: z.string().uuid() }).parse(req.params);
            const body = AttachImageSchema.parse({ ...req.body, productId });
            const attached = await mediaStorage.attachImageToProduct(body);
            return res.status(201).json({
                success: true,
                message: 'Image attached to product',
                image: attached,
            });
        }),
    ],

    /** DELETE /api/products/:productId/images/:mediaId (ADMIN) */
    removeProductImage: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { productId, mediaId } = z
                .object({ productId: z.string().uuid(), mediaId: z.string().uuid() })
                .parse(req.params);
            await mediaStorage.removeProductImage(productId, mediaId);
            return res.json({ success: true, message: 'Image removed from product' });
        }),
    ],

    /** PUT /api/products/:productId/images/reorder (ADMIN) */
    reorderProductImages: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { productId } = z.object({ productId: z.string().uuid() }).parse(req.params);
            const order = z.array(
                z.object({ mediaId: z.string().uuid(), sortOrder: z.number().int().min(0) })
            ).parse(req.body?.order ?? []);
            await mediaStorage.reorderProductImages(productId, order);
            res.json({ success: true });
        }),
    ],

    /** PUT /api/products/:productId/images/:mediaId/role (ADMIN) */
    updateImageRole: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { productId, mediaId } = z
                .object({ productId: z.string().uuid(), mediaId: z.string().uuid() })
                .parse(req.params);
            const { role } = UpdateImageRoleSchema.parse({ ...req.body, productId, mediaId });
            await mediaStorage.updateProductImageRole(productId, mediaId, role);
            return res.json({ success: true, message: 'Image role updated' });
        }),
    ],

    /** PUT /api/products/:productId/images/:mediaId/alt (ADMIN) */
    updateImageAlt: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { productId, mediaId } = z
                .object({ productId: z.string().uuid(), mediaId: z.string().uuid() })
                .parse(req.params);
            const { altText } = UpdateImageAltSchema.parse({ ...req.body, productId, mediaId });
            await mediaStorage.updateProductImageAlt(productId, mediaId, altText);
            return res.json({ success: true, message: 'Image alt text updated' });
        }),
    ],
};
