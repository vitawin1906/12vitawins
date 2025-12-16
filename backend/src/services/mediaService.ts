// src/services/mediaService.ts
import mediaStorage from '#storage/mediaStorage';
import { cloudinary } from '../integrations/cloudinary';

/* ───────────────── Types ───────────────── */

export type UploadResult = {
    mediaId: string;    // UUID из uploaded_media
    publicId: string;   // Cloudinary public_id (строка)
    url: string;        // Cloudinary secure_url
    format: string | null;
    width: number | null;
    height: number | null;
    bytes: number | null;
};

export type AttachImageInput = {
    productId: string;
    cloudinaryPublicId: string;
    url: string;
    format?: string | null;
    width?: number | null;
    height?: number | null;
    bytes?: number | null;
    altText?: string | null;
    role?: 'main' | 'gallery';
    sortOrder?: number;
};

export type ReorderImageInput = {
    productId: string;
    order: Array<{ mediaId: string; sortOrder: number }>;
};

export type UpdateImageRoleInput = {
    productId: string;
    mediaId: string;
    role: 'main' | 'gallery';
};

export type UpdateImageAltInput = {
    productId: string;
    mediaId: string;
    altText: string | null;
};

export type ReplaceAllImagesInput = {
    productId: string;
    images: Array<{
        mediaId: string;
        role: 'main' | 'gallery';
        alt?: string | null;
        sortOrder: number;
    }>;
};

/* ───────────────── Service ───────────────── */

export const mediaService = {
    // uploadImage removed (server-side uploads deprecated)

    /** Получить информацию о загруженном изображении по ID */
    async getImageById(id: string) {
        return mediaStorage.getUploadedImageById(id);
    },

    /** Получить информацию о загруженном изображении по Cloudinary publicId */
    async getImageByPublicId(publicId: string) {
        return mediaStorage.getUploadedImageByPublicId(publicId);
    },

    /** Список всех загруженных изображений с фильтрацией */
    async listImages(params: {
        q?: string;
        limit?: number;
        offset?: number;
        orderBy?: 'createdAt' | 'publicId' | 'url';
        orderDir?: 'asc' | 'desc';
    } = {}) {
        return mediaStorage.listUploadedImages(params);
    },

    /**
     * Удалить изображение из системы (только если не используется).
     * Удаляет как из БД, так и из Cloudinary.
     */
    async deleteImage(id: string): Promise<{ success: boolean; reason?: string }> {
        const media = await mediaStorage.getUploadedImageById(id);
        if (!media) return { success: false, reason: 'Image not found' };

        // Проверяем использование
        const usedInProducts = await mediaStorage.getProductsUsingMedia(id);
        if (usedInProducts.length > 0) {
            return {
                success: false,
                reason: `Image is used in ${usedInProducts.length} product(s)`,
            };
        }

        // Удаляем из БД
        const deleted = await mediaStorage.deleteUploadedImageById(id);
        if (!deleted) return { success: false, reason: 'Failed to delete from database' };

        // Удаляем из Cloudinary (если знаем publicId; игнорируем ошибки)
        const cloudPubId: string | undefined =
            (media as any).publicId ?? (media as any).cloudinaryPublicId;
        if (cloudPubId) {
            try {
                await cloudinary.uploader.destroy(cloudPubId);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn(`Failed to delete from Cloudinary: ${cloudPubId}`, err);
            }
        }

        return { success: true };
    },

    /* ─────────────── Media Stats & Cleanup ─────────────── */

    /** Статистика использования медиа */
    async getMediaStats() {
        return mediaStorage.getMediaStats();
    },

    /** Список неиспользуемых изображений */
    async listOrphanedMedia(limit = 100) {
        return mediaStorage.listOrphanedMedia(limit);
    },

    /**
     * Массовое удаление неиспользуемых изображений (БД + Cloudinary).
     */
    async cleanupOrphanedMedia(
        limit = 50,
    ): Promise<{ deleted: number; failedCloudinary: string[] }> {
        const orphaned = await mediaStorage.listOrphanedMedia(limit);
        if (orphaned.length === 0) return { deleted: 0, failedCloudinary: [] };

        const publicIds: string[] = orphaned
            .map((m: any) => m.publicId ?? m.cloudinaryPublicId)
            .filter((v): v is string => typeof v === 'string' && v.length > 0);

        const deleted = await mediaStorage.deleteOrphanedMedia(limit);

        const failedCloudinary: string[] = [];
        for (const publicId of publicIds) {
            try {
                const res = await cloudinary.uploader.destroy(publicId);
                // считаем "ok" и "not found" успешными для идемпотентности
                if (!res || (res.result !== 'ok' && res.result !== 'not found')) {
                    failedCloudinary.push(publicId);
                }
            } catch {
                failedCloudinary.push(publicId);
            }
        }

        return { deleted, failedCloudinary };
    },

    /* ─────────────── Product Images Management ─────────────── */

    /** Получить все изображения продукта с полной информацией */
    async getProductImages(productId: string) {
        return mediaStorage.listProductImages(productId);
    },

    /**
     * Привязать изображение к продукту.
     */
    async attachImageToProduct(input: AttachImageInput) {
        const payload: any = {
            productId: input.productId,
            cloudinaryPublicId: input.cloudinaryPublicId,
            url: input.url,
            format: input.format ?? null,
            width: input.width ?? null,
            height: input.height ?? null,
            bytes: input.bytes ?? null,
            altText: input.altText ?? null,
            role: input.role ?? 'gallery',
        };
        if (input.sortOrder !== undefined) payload.sortOrder = input.sortOrder;

        return mediaStorage.attachImageToProduct(payload);
    },

    // uploadAndAttachToProduct removed (server-side uploads deprecated)

    /** Отвязать изображение от продукта (само изображение остаётся в uploaded_media) */
    async removeImageFromProduct(productId: string, mediaId: string) {
        await mediaStorage.removeProductImage(productId, mediaId);
    },

    /** Изменить порядок изображений продукта */
    async reorderProductImages(input: ReorderImageInput) {
        await mediaStorage.reorderProductImages(input.productId, input.order);
    },

    /** Изменить роль изображения (main/gallery) */
    async updateProductImageRole(input: UpdateImageRoleInput) {
        await mediaStorage.updateProductImageRole(input.productId, input.mediaId, input.role);
    },

    /** Обновить alt-текст изображения */
    async updateProductImageAlt(input: UpdateImageAltInput) {
        await mediaStorage.updateProductImageAlt(input.productId, input.mediaId, input.altText);
    },

    /** Полностью заменить все изображения продукта */
    async replaceAllProductImages(input: ReplaceAllImagesInput) {
        await mediaStorage.replaceAllProductImages(input.productId, input.images);
    },

    /** Получить список продуктов, использующих конкретное изображение */
    async getProductsUsingMedia(mediaId: string) {
        return mediaStorage.getProductsUsingMedia(mediaId);
    },

    /* ─────────────── Cloudinary Utilities ─────────────── */

    /** Получить трансформированный URL изображения */
    getTransformedUrl(publicId: string, transformation: Record<string, any>): string {
        return cloudinary.url(publicId, { ...transformation, secure: true });
    },

    /** Генерация thumbnail URL */
    getThumbnailUrl(publicId: string, width = 200, height = 200): string {
        return this.getTransformedUrl(publicId, {
            width,
            height,
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto',
            format: 'jpg',
        });
    },

    /** Генерация оптимизированного URL для веба */
    getOptimizedUrl(publicId: string, maxWidth = 1200): string {
        return this.getTransformedUrl(publicId, {
            width: maxWidth,
            crop: 'limit',
            quality: 'auto:good',
            fetch_format: 'auto',
        });
    },

    /** Удалить изображение из Cloudinary по publicId */
    async deleteFromCloudinary(publicId: string): Promise<boolean> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result?.result === 'ok' || result?.result === 'not found';
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`Failed to delete from Cloudinary: ${publicId}`, err);
            return false;
        }
    },

    /** Batch удаление из Cloudinary */
    async batchDeleteFromCloudinary(publicIds: string[]): Promise<{ succeeded: string[]; failed: string[] }> {
        const succeeded: string[] = [];
        const failed: string[] = [];

        for (const publicId of publicIds) {
            try {
                const result = await cloudinary.uploader.destroy(publicId);
                if (result?.result === 'ok' || result?.result === 'not found') {
                    succeeded.push(publicId);
                } else {
                    failed.push(publicId);
                }
            } catch {
                failed.push(publicId);
            }
        }

        return { succeeded, failed };
    },
};

export default mediaService;
