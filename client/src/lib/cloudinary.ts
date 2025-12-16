// client/src/lib/cloudinary.ts

// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = 'dqtngvvfm';
const CLOUDINARY_UPLOAD_PRESET = 'vitawins'; // Создайте этот preset в Cloudinary Dashboard (см. CLOUDINARY_PRESET_SETUP.md)

// Базовый endpoint для unsigned upload
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResponse {
    secure_url: string;
    public_id: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
    url: string;
    asset_id: string;
    version: number;
    created_at: string;
    // Cloudinary может прислать ещё много полей — оставляем нужные
}

/**
 * Прямой аплоад на Cloudinary (UNSIGNED).
 * ВАЖНО: для unsigned не передаём transformation — делай трансформации в delivery-URL.
 */
export async function uploadToCloudinary(
    file: File,
    options?: {
        folder?: string;
        // transformation?: string; // не используем на этапе upload для unsigned
        onProgress?: (progress: number) => void;
    }
): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (options?.folder) formData.append('folder', options.folder);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (options?.onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = (e.loaded / e.total) * 100;
                    options.onProgress!(progress);
                }
            });
        }

        xhr.addEventListener('load', () => {
            const text = xhr.responseText || '';
            if (xhr.status === 200) {
                try {
                    const json = JSON.parse(text) as CloudinaryUploadResponse;
                    resolve(json);
                } catch {
                    reject(new Error('Failed to parse Cloudinary response'));
                }
            } else {
                // Пытаемся вытащить нормальное сообщение об ошибке от Cloudinary
                try {
                    const err = JSON.parse(text);
                    const msg = err?.error?.message || `Cloudinary upload failed (${xhr.status})`;
                    reject(new Error(msg));
                } catch {
                    reject(new Error(`Cloudinary upload failed (${xhr.status})`));
                }
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.send(formData);
    });
}

/**
 * Сборка delivery-URL (для рендера/превью).
 * Можно добавить transformation и/или version (для cache-busting).
 */
type BuildOpts = {
    transformation?: string;          // напр: "f_auto,q_auto,c_limit,w_1200"
    version?: number | string;        // из ответа upload: res.version
    format?: string;                  // форсировать расширение: 'jpg' | 'webp' и т.п.
    cloudName?: string;               // по умолчанию берётся из ENV
    resourceType?: 'image' | 'video' | 'raw';
    deliveryType?: 'upload' | 'private' | 'authenticated';
};

export function buildCloudinaryUrl(publicId: string, opts: BuildOpts = {}) {
    const cloud = opts.cloudName ?? CLOUDINARY_CLOUD_NAME;
    const resource = opts.resourceType ?? 'image';
    const delivery = opts.deliveryType ?? 'upload';
    const t = (opts.transformation ?? '').replace(/^\/+|\/+$/g, '');
    const v = opts.version ? `v${opts.version}` : '';
    const id = opts.format ? `${publicId}.${opts.format}` : publicId;
    const path = [t, v, id].filter(Boolean).join('/');

    return `https://res.cloudinary.com/${cloud}/${resource}/${delivery}/${path}`;
}

/** Упрощённый helper */
export function getCloudinaryUrl(publicId: string, transformation?: string, version?: number | string) {
    return buildCloudinaryUrl(publicId, { transformation, version });
}

/** Thumbnail helper */
export function getThumbnailUrl(publicId: string) {
    return getCloudinaryUrl(publicId, 'f_auto,q_auto,c_fill,w_200,h_200');
}
