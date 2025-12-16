// client/src/utils/imageUtils.ts

/* =========================================================
 * Универсальные утилиты картинок под новую схему:
 * [{ mediaId, role: 'main'|'gallery', sortOrder }]
 * =======================================================*/

export type ImageObject = {
    url?: string | null;
    webp_url?: string | null;
    thumbnail_url?: string | null;
    alt_text?: string | null;
    is_primary?: boolean | null;
    position?: number | null;
};

export type ImageLike =
    | string
    | {
    url?: string;        // приоритетное поле - полный Cloudinary URL
    secure_url?: string;
    src?: string;
    path?: string;
    media?: { url?: string; secure_url?: string };
    mediaId?: string;    // Cloudinary public_id (используется только если нет url)
    role?: string;       // 'main' | 'gallery'
    isMain?: boolean;
    is_primary?: boolean;
    sortOrder?: number;
}
    | null
    | undefined;

export type ImageSource = string | null | undefined | ImageObject;

type Options = {
    placeholder?: string;
    // Если бэк когда-то вернёт /api/uploads/... а статика отдаётся с /uploads
    rewriteApiUploadsToStatic?: boolean;
};

const DEFAULT_PLACEHOLDER = "/placeholder.svg";
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD as string | undefined;

function isHttpUrl(s: string) {
    return /^https?:\/\//i.test(s);
}

function cleanPath(s: string) {
    // убираем лишние слэши и нормализуем ведущий слэш
    const once = s.replace(/\/+/g, "/");
    return once.startsWith("/") ? once : `/${once}`;
}

function pickFromLegacyObject(img: ImageObject | null | undefined): string | null {
    if (!img) return null;
    return img.webp_url || img.url || img.thumbnail_url || null;
}

/* ------------------------- low-level normalize ------------------------- */

function normalizeOneLegacy(
    input: ImageSource,
    opts?: Options
): string | null {
    const raw = typeof input === "string" ? input : pickFromLegacyObject(input);
    if (!raw) return null;
    if (isHttpUrl(raw)) return raw;

    let p = cleanPath(raw);
    if (opts?.rewriteApiUploadsToStatic && p.startsWith("/api/uploads/")) {
        p = p.replace("/api/uploads/", "/uploads/");
    }
    return p;
}

/* ------------------------- новая схема с mediaId ------------------------- */

/**
 * Превращает ImageLike (строку/объект) в абсолютный/относительный URL.
 * НОВАЯ ЛОГИКА:
 * - Приоритет 1: поле url (полный Cloudinary URL)
 * - Приоритет 2: secure_url, src, path
 * - Приоритет 3: mediaId как Cloudinary public_id → собираем URL
 */
export function resolveImageUrl(img: ImageLike): string | undefined {
    if (!img) return undefined;

    // Строка
    if (typeof img === "string") {
        return isHttpUrl(img) ? img : cleanPath(img);
    }

    // ПРИОРИТЕТ 1: url (из новой схемы БД)
    if (typeof img.url === "string" && img.url.trim()) {
        return isHttpUrl(img.url) ? img.url : cleanPath(img.url);
    }

    // ПРИОРИТЕТ 2: legacy поля
    const direct =
        img.secure_url ??
        img.src ??
        img.path ??
        img.media?.secure_url ??
        img.media?.url;

    if (typeof direct === "string") {
        return isHttpUrl(direct) ? direct : cleanPath(direct);
    }

    // ПРИОРИТЕТ 3: mediaId как Cloudinary public_id
    if (typeof img.mediaId === "string" && img.mediaId.trim()) {
        const id = img.mediaId.trim();
        // Если это уже URL (legacy данные) - возвращаем как есть
        if (isHttpUrl(id)) return id;
        // Собираем Cloudinary URL из public_id
        if (CLOUD) return `https://res.cloudinary.com/${CLOUD}/image/upload/${id}`;
    }

    return undefined;
}

/* ------------------------- high-level helpers ------------------------- */

/**
 * Возвращает лучший URL из:
 * - строки (URL/путь),
 * - объекта { url, webp_url, thumbnail_url, ... } (legacy),
 * - массива таких элементов.
 * Используется там, где ещё живёт старое поле с разными вариантами.
 */
export function getProductImageUrl(
    image: ImageSource | ImageSource[] | null | undefined,
    opts?: Options
): string {
    const placeholder = opts?.placeholder ?? DEFAULT_PLACEHOLDER;

    if (Array.isArray(image)) {
        if (image.length === 0) return placeholder;

        // Сначала is_primary === true, затем по position
        const sorted = [...image].sort((a, b) => {
            const ai = (typeof a === "string" ? null : a?.is_primary) ? 1 : 0;
            const bi = (typeof b === "string" ? null : b?.is_primary) ? 1 : 0;
            if (ai !== bi) return bi - ai;

            const ap =
                typeof a === "string"
                    ? Number.POSITIVE_INFINITY
                    : a?.position ?? Number.POSITIVE_INFINITY;
            const bp =
                typeof b === "string"
                    ? Number.POSITIVE_INFINITY
                    : b?.position ?? Number.POSITIVE_INFINITY;
            return ap - bp;
        });

        for (const it of sorted) {
            const url = normalizeOneLegacy(it, opts);
            if (url) return url;
        }
        return placeholder;
    }

    const single = normalizeOneLegacy(image, opts);
    return single ?? placeholder;
}

/**
 * Возвращает главное изображение продукта из нового массива `images`
 * с поддержкой:
 * - role === 'main'
 * - sortOrder (меньше — раньше)
 * - fallback на любой доступный URL
 * - fallback на одиночное поле image (если ещё есть)
 */
export function getMainProductImage(p: { images?: ImageLike[]; image?: string }): string {
    const imgs = Array.isArray(p?.images) ? (p.images as ImageLike[]) : [];

    // 1) В приоритете role === 'main' (с сортировкой по sortOrder)
    const mains = imgs
        .filter((x: any) => String(x?.role ?? "").toLowerCase() === "main")
        .sort(
            (a: any, b: any) =>
                Number(a?.sortOrder ?? 9999) - Number(b?.sortOrder ?? 9999)
        );

    for (const it of mains) {
        const u = resolveImageUrl(it);
        if (u) return u;
    }

    // 2) Если нет main — берём по sortOrder
    const sorted = [...imgs].sort(
        (a: any, b: any) =>
            Number(a?.sortOrder ?? 9999) - Number(b?.sortOrder ?? 9999)
    );
    for (const it of sorted) {
        const u = resolveImageUrl(it);
        if (u) return u;
    }

    // 3) fallback на старое одиночное поле
    if (typeof p?.image === "string" && p.image) {
        return isHttpUrl(p.image) ? p.image : cleanPath(p.image);
    }

    return DEFAULT_PLACEHOLDER;
}
