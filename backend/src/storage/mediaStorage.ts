// src/storage/mediaStorage.ts
import { db } from '#db/db';
import { z } from 'zod';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { product } from '#db/schema/products';
import { uploadedMedia } from '#db/schema';
import { toJsonbArraySafe } from './_jsonb';
import {ProductImageRole, ProductImagesNonEmpty} from "#db/shemaTypes/productImagesTypes";

/* ───────────────── Types ───────────────── */

type UploadedMediaRow = typeof uploadedMedia.$inferSelect;
type ProductImageItem = {
    mediaId: string;                 // Cloudinary public_id
    url: string;                     // Cloudinary secure_url (всегда есть)
    role: 'main' | 'gallery';
    alt: string | null;
    sortOrder: number;
    format?: string | null;
    width?: number | null;
    height?: number | null;
    bytes?: number | null;
};

/* ───────────────── Validation Schemas ───────────────── */

const mediaIdRegex = /^[a-zA-Z0-9\/_-]+$/;

const CloudinaryHttpsUrl = z
  .string()
  .url()
  .superRefine((value, ctx) => {
      try {
          const u = new URL(value);
          if (u.protocol !== 'https:') {
              ctx.addIssue({ code: 'custom', message: 'URL must be HTTPS' });
          }
          if (u.hostname !== 'res.cloudinary.com') {
              ctx.addIssue({ code: 'custom', message: 'URL host must be res.cloudinary.com' });
          }
      } catch {
          ctx.addIssue({ code: 'custom', message: 'Invalid URL' });
      }
  });

const NewUploaded = z.object({
    cloudinaryPublicId: z.string().regex(mediaIdRegex, { message: 'Invalid mediaId format' }),
    url: CloudinaryHttpsUrl,
    format: z.string().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    bytes: z.number().int().optional(),
});

const AttachArgs = z.object({
    productId: z.string().uuid(),
    url: CloudinaryHttpsUrl,
    cloudinaryPublicId: z.string().regex(mediaIdRegex, { message: 'Invalid mediaId format' }),
    format: z.string().nullable().optional(),
    width: z.number().int().nullable().optional(),
    height: z.number().int().nullable().optional(),
    bytes: z.number().int().nullable().optional(),
    altText: z.string().nullable().optional(),
    role: ProductImageRole.default('gallery'),
    sortOrder: z.number().int().min(0).optional(),
});

const ReorderItem = z.object({
    mediaId: z.string().regex(mediaIdRegex, { message: 'Invalid mediaId format' }),
    sortOrder: z.number().int().min(0),
});

/* ───────────────── Uploaded Media ───────────────── */

/** Идемпотентно создаёт запись об аплоаде по publicId. */
export async function upsertUploadedByPublicId(inputRaw: unknown): Promise<UploadedMediaRow> {
    const input = NewUploaded.parse(inputRaw);

    // ---- ✔️ FIX: Приводим returning() к массиву ----
    const inserted = (await db
        .insert(uploadedMedia)
        .values({
            publicId: input.cloudinaryPublicId,
            url: input.url,
            format: input.format ?? null,
            width: input.width ?? null,
            height: input.height ?? null,
            bytes: input.bytes ?? null,
            meta: null,
        })
        .onConflictDoNothing({ target: uploadedMedia.publicId })
        .returning()) as UploadedMediaRow[];

    if (inserted.length > 0 && inserted[0]) {
        return inserted[0];
    }

    // ---- ✔️ SELECT всегда строго массив ----
    const exists = await db
        .select()
        .from(uploadedMedia)
        .where(eq(uploadedMedia.publicId, input.cloudinaryPublicId))
        .limit(1);

    if (!exists[0]) {
        throw new Error(`Uploaded media not found after upsert: ${input.cloudinaryPublicId}`);
    }
    return exists[0];
}

/** Получить изображение по ID */
export async function getUploadedImageById(id: string): Promise<UploadedMediaRow | null> {
    const [row] = await db
        .select()
        .from(uploadedMedia)
        .where(eq(uploadedMedia.id, id))
        .limit(1);
    return row ?? null;
}

/** Получить изображение по publicId */
export async function getUploadedImageByPublicId(publicId: string): Promise<UploadedMediaRow | null> {
    const [row] = await db
        .select()
        .from(uploadedMedia)
        .where(eq(uploadedMedia.publicId, publicId))
        .limit(1);
    return row ?? null;
}

/** Получить список загруженных изображений с фильтрацией и пагинацией */
export async function listUploadedImages(params: {
    q?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'publicId' | 'url';
    orderDir?: 'asc' | 'desc';
} = {}) {
    const { q, limit = 20, offset = 0, orderBy = 'createdAt', orderDir = 'desc' } = params;

    const where =
        q && q.trim()
            ? or(
                ilike(uploadedMedia.url, `%${q}%`),
                ilike(uploadedMedia.publicId, `%${q}%`),
            )
            : undefined;

    const orderExpr =
        orderBy === 'publicId'
            ? uploadedMedia.publicId
            : orderBy === 'url'
                ? uploadedMedia.url
                : uploadedMedia.createdAt;

    const orderSql = orderDir === 'asc' ? asc(orderExpr) : desc(orderExpr);

    const totalRows = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(uploadedMedia)
        .where(where ?? sql`true`);

    const items = await db
        .select({
            id: uploadedMedia.id,
            publicId: uploadedMedia.publicId,
            url: uploadedMedia.url,
            format: uploadedMedia.format,
            width: uploadedMedia.width,
            height: uploadedMedia.height,
            bytes: uploadedMedia.bytes,
            createdAt: uploadedMedia.createdAt,
        })
        .from(uploadedMedia)
        .where(where ?? sql`true`)
        .orderBy(orderSql)
        .limit(limit)
        .offset(offset);

    return {
        items,
        total: Number(totalRows[0]?.cnt ?? 0),
    };
}

/** Удалить изображение, если оно не привязано ни к одному товару */
export async function deleteUploadedImageById(id: string): Promise<boolean> {
    // Сначала получаем publicId по UUID
    const [media] = await db
        .select({ publicId: uploadedMedia.publicId })
        .from(uploadedMedia)
        .where(eq(uploadedMedia.id, id))
        .limit(1);

    if (!media?.publicId) return false;

    // Проверяем, используется ли publicId в каких-либо продуктах
    const linked = await db
        .select({ one: sql`1` })
        .from(product)
        .where(
            sql`EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(${product.images}, '[]'::jsonb)) AS img
                WHERE (img->>'mediaId') = ${media.publicId}
            )`,
        )
        .limit(1);

    if (linked.length > 0) return false;

    const res = await db
        .delete(uploadedMedia)
        .where(eq(uploadedMedia.id, id))
        .returning({ id: uploadedMedia.id });

    return res.length > 0;
}

/** Получить неиспользуемые изображения (для очистки) */
export async function listOrphanedMedia(limit = 100): Promise<UploadedMediaRow[]> {
    const result = await db.execute(sql`
        SELECT um.*
        FROM ${uploadedMedia} um
        WHERE NOT EXISTS (
            SELECT 1
            FROM ${product} p,
                 jsonb_array_elements(COALESCE(p.images, '[]'::jsonb)) AS img
            WHERE (img->>'mediaId') = um.public_id
        )
        LIMIT ${limit}
    `);

    return result.rows as UploadedMediaRow[];
}

/** Статистика использования медиа */
export async function getMediaStats() {
    const result = await db.execute(sql`
        SELECT
            (SELECT COUNT(*) FROM ${uploadedMedia}) as total,
            (
                SELECT COUNT(DISTINCT (img->>'mediaId'))
                FROM ${product},
                jsonb_array_elements(COALESCE(${product.images}, '[]'::jsonb)) AS img
                WHERE (img->>'mediaId') IS NOT NULL
            ) as used
    `);

    const stats = result.rows[0] as { total: string; used: string } | undefined;
    const total = Number(stats?.total ?? 0);
    const used = Number(stats?.used ?? 0);

    return {
        total,
        used,
        orphaned: total - used,
    };
}

/** Массовое удаление неиспользуемых изображений */
export async function deleteOrphanedMedia(limit = 50): Promise<number> {
    const orphaned = await listOrphanedMedia(limit);
    if (orphaned.length === 0) return 0;

    const ids = orphaned.map(m => m.id);
    const deleted = await db
        .delete(uploadedMedia)
        .where(inArray(uploadedMedia.id, ids))
        .returning({ id: uploadedMedia.id });

    return deleted.length;
}

/* ───────────────── Product Images ───────────────── */

/** Вернуть изображения товара, дополненные метаданными из uploaded_media по publicId. */
export async function listProductImages(productId: string): Promise<ProductImageItem[]> {
    const [row] = await db
        .select({ images: product.images })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);

    if (!row) return [];

    const items = Array.isArray(row.images) ? (row.images as any[]) : [];
    if (items.length === 0) return [];

    // Собираем publicId (mediaId) для JOIN
    const publicIds = items.map((i) => i?.mediaId).filter(Boolean);
    if (publicIds.length === 0) {
        // Если нет mediaId, возвращаем как есть (только с url из JSONB)
        return items
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((i) => ({
                mediaId: i.mediaId ?? '',
                url: i.url ?? '',
                role: (i.role ?? 'gallery') as 'main' | 'gallery',
                alt: i.alt ?? null,
                sortOrder: i.sortOrder ?? 0,
            }));
    }

    // JOIN по publicId (а не по UUID!)
    const mediaRows = await db
        .select({
            publicId: uploadedMedia.publicId,
            url: uploadedMedia.url,
            format: uploadedMedia.format,
            width: uploadedMedia.width,
            height: uploadedMedia.height,
            bytes: uploadedMedia.bytes,
        })
        .from(uploadedMedia)
        .where(inArray(uploadedMedia.publicId, publicIds as string[]));

    const byPublicId = new Map<string, (typeof mediaRows)[number]>(
        (mediaRows ?? []).map((m) => [m.publicId!, m]),
    );

    return items
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((i) => {
            const media = byPublicId.get(i.mediaId);
            return {
                mediaId: i.mediaId,
                url: i.url ?? media?.url ?? '', // приоритет у url из JSONB
                role: (i.role ?? 'gallery') as 'main' | 'gallery',
                alt: i.alt ?? null,
                sortOrder: i.sortOrder ?? 0,
                format: media?.format ?? null,
                width: media?.width ?? null,
                height: media?.height ?? null,
                bytes: media?.bytes ?? null,
            };
        });
}

/** Добавить изображение в product.images (идемпотентно по publicId) */
export async function attachImageToProduct(argsRaw: unknown) {
    const args = AttachArgs.parse(argsRaw);

    // 1) upsert в uploaded_media
    const media = await upsertUploadedByPublicId({
        cloudinaryPublicId: args.cloudinaryPublicId,
        url: args.url,
        format: args.format ?? undefined,
        width: args.width ?? undefined,
        height: args.height ?? undefined,
        bytes: args.bytes ?? undefined,
    });

    // 2) получить текущий список
    const [row] = await db
        .select({ images: product.images })
        .from(product)
        .where(eq(product.id, args.productId))
        .limit(1);

    if (!row) throw new Error('Product not found');

    const curr = Array.isArray(row.images) ? (row.images as any[]) : [];

    // Проверка: не добавляем дубликаты (по publicId, а не по UUID!)
    if (curr.some((img: any) => img.mediaId === args.cloudinaryPublicId)) {
        throw new Error('Image already attached to this product');
    }

    const sortOrder =
        args.sortOrder ?? (curr.length ? Math.max(...curr.map((i: any) => i.sortOrder ?? 0)) + 1 : 0);

    const next = [
        ...curr,
        {
            mediaId: args.cloudinaryPublicId,  // сохраняем public_id
            url: args.url,                     // сохраняем secure_url
            role: args.role,
            alt: args.altText ?? null,
            sortOrder
        },
    ];

    // 3) валидация и запись как JSONB
    const validated = ProductImagesNonEmpty.parse(next);

    await db
        .update(product)
        .set({
            images: toJsonbArraySafe(validated),
            updatedAt: new Date(),
        })
        .where(eq(product.id, args.productId));

    return {
        mediaId: args.cloudinaryPublicId,
        url: args.url,
        role: args.role,
        alt: args.altText ?? null,
        sortOrder,
    };
}

/** Удалить изображение из product.images (оставляя минимум одно) */
export async function removeProductImage(productId: string, mediaId: string): Promise<void> {
    const [row] = await db
        .select({ images: product.images })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);

    if (!row) throw new Error('Product not found');

    const curr: any[] = Array.isArray(row.images) ? row.images : [];
    const filtered = curr.filter((i: any) => i.mediaId !== mediaId);

    if (filtered.length === 0) {
        const err = new Error('At least one image required');
        (err as any).code = 'images_empty_not_allowed';
        throw err;
    }

    const renumbered = filtered
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((x: any, i: number) => ({ ...x, sortOrder: i }));

    // Обеспечиваем наличие хотя бы одного main
    const hasMain = renumbered.some((img: any) => img.role === 'main');
    if (!hasMain && renumbered.length > 0) {
        renumbered[0].role = 'main';
    }

    const validated = ProductImagesNonEmpty.parse(renumbered);

    await db
        .update(product)
        .set({
            images: toJsonbArraySafe(validated),
            updatedAt: new Date(),
        })
        .where(eq(product.id, productId));
}

/** Обновить порядок изображений продукта */
export async function reorderProductImages(
    productId: string,
    order: Array<{ mediaId: string; sortOrder: number }>
): Promise<void> {
    const orderArray = z.array(ReorderItem).parse(order ?? []); // <= дефолт к []
    const [row] = await db
        .select({ images: product.images })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);

    if (!row) throw new Error('Product not found');

    const curr: any[] = Array.isArray(row.images) ? row.images : [];
    const orderMap = new Map(orderArray.map(o => [o.mediaId, o.sortOrder]));

    const reordered = curr
        .map(img => ({
            ...img,
            sortOrder: orderMap.get(img.mediaId) ?? img.sortOrder,
        }))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const validated = ProductImagesNonEmpty.parse(reordered);

    await db
        .update(product)
        .set({
            images: toJsonbArraySafe(validated),
            updatedAt: new Date(),
        })
        .where(eq(product.id, productId));
}

/** Обновить роль изображения (main/gallery) */
export async function updateProductImageRole(
    productId: string,
    mediaId: string,
    newRole: 'main' | 'gallery'
): Promise<void> {
    const [row] = await db
        .select({ images: product.images })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);

    if (!row) throw new Error('Product not found');

    const curr: any[] = Array.isArray(row.images) ? row.images : [];

    // Если устанавливаем main, снимаем main с остальных
    const updated = curr.map(img => {
        if (img.mediaId === mediaId) {
            return { ...img, role: newRole };
        }
        if (newRole === 'main' && img.role === 'main') {
            return { ...img, role: 'gallery' };
        }
        return img;
    });

    const validated = ProductImagesNonEmpty.parse(updated);

    await db
        .update(product)
        .set({
            images: toJsonbArraySafe(validated),
            updatedAt: new Date(),
        })
        .where(eq(product.id, productId));
}

/** Обновить alt-текст изображения */
export async function updateProductImageAlt(
    productId: string,
    mediaId: string,
    altText: string | null
): Promise<void> {
    const [row] = await db
        .select({ images: product.images })
        .from(product)
        .where(eq(product.id, productId))
        .limit(1);

    if (!row) throw new Error('Product not found');

    const curr: any[] = Array.isArray(row.images) ? row.images : [];
    const updated = curr.map(img =>
        img.mediaId === mediaId ? { ...img, alt: altText } : img
    );

    const validated = ProductImagesNonEmpty.parse(updated);

    await db
        .update(product)
        .set({
            images: toJsonbArraySafe(validated),
            updatedAt: new Date(),
        })
        .where(eq(product.id, productId));
}

/** Полная замена всех изображений продукта */
export async function replaceAllProductImages(
    productId: string,
    images: Array<{
        mediaId: string;
        role: 'main' | 'gallery';
        alt?: string | null;
        sortOrder: number;
    }>
): Promise<void> {
    if (images.length === 0) {
        throw new Error('Product must have at least one image');
    }

    // Проверяем, что все mediaId существуют
    const mediaIds = images.map(img => img.mediaId);
    const existing = await db
        .select({ id: uploadedMedia.id })
        .from(uploadedMedia)
        .where(inArray(uploadedMedia.id, mediaIds));

    if (existing.length !== mediaIds.length) {
        throw new Error('Some media IDs do not exist');
    }

    const validated = ProductImagesNonEmpty.parse(images);

    await db
        .update(product)
        .set({
            images: toJsonbArraySafe(validated),
            updatedAt: new Date(),
        })
        .where(eq(product.id, productId));
}

/** Получить продукты, использующие конкретное изображение (по UUID или publicId) */
export async function getProductsUsingMedia(mediaIdOrUuid: string): Promise<string[]> {
    // Если это UUID из uploaded_media, получаем publicId
    let publicId = mediaIdOrUuid;

    // Проверяем, является ли это UUID
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(mediaIdOrUuid)) {
        const [media] = await db
            .select({ publicId: uploadedMedia.publicId })
            .from(uploadedMedia)
            .where(eq(uploadedMedia.id, mediaIdOrUuid))
            .limit(1);

        if (!media?.publicId) return [];
        publicId = media.publicId;
    }

    const result = await db.execute(sql`
        SELECT id
        FROM ${product}
        WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(${product.images}, '[]'::jsonb)) AS img
            WHERE (img->>'mediaId') = ${publicId}
        )
    `);

    return (result.rows as Array<{ id: string }>).map(r => r.id);
}

/* ───────────────── Export all ───────────────── */

export const mediaStorage = {
    // Uploaded Media
    upsertUploadedByPublicId,
    getUploadedImageById,
    getUploadedImageByPublicId,
    listUploadedImages,
    deleteUploadedImageById,
    listOrphanedMedia,
    getMediaStats,
    deleteOrphanedMedia,
    getProductsUsingMedia,

    // Product Images
    listProductImages,
    attachImageToProduct,
    removeProductImage,
    reorderProductImages,
    updateProductImageRole,
    updateProductImageAlt,
    replaceAllProductImages,
};

export default mediaStorage;