// src/services/productService.ts
import { db } from '#db/db';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
    product,
    type Product as DBProduct,
    type NewProduct as DBNewProduct,
} from '#db/schema/products';
import { category } from '#db/schema/categories';
import { uploadedMedia } from '#db/schema/media';
import { productStatusEnum, uiStatusEnum } from '#db/schema/enums';
import { settlementSettingsRuntime } from '#config/settlementSettings';

// ===== Если есть промо — оставь true и проверь импорт. Иначе поставь false и закомментируй блоки =====
const PROMOTIONS_ENABLED = true;
// @ts-ignore: таблицы промо могут отсутствовать у некоторых инсталляций
import { promotion, promotionProduct } from '#db/schema/promotions';

type ProductImageRef = { mediaId: string; role?: 'main' | 'gallery'; alt?: string; sortOrder?: number };
type ProductRow = Omit<DBProduct, 'images'> & { images: ProductImageRef[] };

type SortKey = 'newest' | 'price_asc' | 'price_desc';

export type PublicProductDTO = {
    id: string;
    slug: string;
    name: string;
    stock: number;

    priceRub: number;
    effectivePriceRub: number;
    discountPercent: number | null;

    pvEach: number;
    cashbackRub: number;

    primaryImageUrl: string | null;
};

export type AdminProductDTO = {
    row: DBProduct; // как есть из БД (сырые поля)
    // вычисляемая мета:
    effectivePriceRub: number;
    discountPercent: number | null;
    pvEach: number;
    cashbackRub: number;
    primaryImageUrl: string | null;
    gallery: Array<{ url: string; role?: 'main' | 'gallery'; alt?: string; sortOrder?: number }>;
};

export type ListParams = {
    q?: string;
    /** прямой фильтр по FK */
    categoryId?: string;
    /** фильтр по slug категории (через join) */
    categorySlug?: string;
    limit?: number;
    offset?: number;
    sort?: SortKey;
};

class TTLCache<T> {
    private store = new Map<string, { value: T; expireAt: number }>();
    get(key: string): T | null {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expireAt) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    set(key: string, value: T, ttlMinutes = 10) {
        const expireAt = Date.now() + ttlMinutes * 60_000;
        this.store.set(key, { value, expireAt });
    }
    del(key: string) {
        this.store.delete(key);
    }
}

function num(v: unknown): number {
    return Number(v ?? 0) || 0;
}
function round2(v: number) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
}

function normalizeNumeric<T extends Partial<DBNewProduct>>(patch: T): T {
    const out: any = { ...patch };
    (['price', 'originalPrice', 'customCashback'] as const).forEach((k) => {
        if (out[k] != null) out[k] = String(out[k]);
    });
    return out;
}

function sortImages(images: ProductImageRef[]): ProductImageRef[] {
    return [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
function pickPrimaryImageId(images: ProductImageRef[]): string | null {
    if (!Array.isArray(images) || images.length === 0) return null;
    const sorted = sortImages(images);
    const main = sorted.find((i) => i.role === 'main') ?? sorted[0];
    return main?.mediaId ?? null;
}

async function batchResolveMediaUrls(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await db
        .select({ id: uploadedMedia.id, url: uploadedMedia.url })
        .from(uploadedMedia)
        .where(inArray(uploadedMedia.id, ids));
    return new Map(rows.map((r) => [r.id, r.url]));
}

type PromoRow = {
    productId: string;
    percentOff: string | null; // проценты
    fixedPriceRub: string | null;
    startsAt: Date | null;
};
async function loadActivePromotions(productIds: string[]): Promise<Map<string, PromoRow>> {
    if (!PROMOTIONS_ENABLED || productIds.length === 0) return new Map();

    const now = new Date();
    const rows = await db
        .select({
            productId: promotionProduct.productId,
            percentOff: promotion.percentOff,
            fixedPriceRub: promotion.fixedPriceRub,
            startsAt: promotion.startsAt,
        })
        .from(promotionProduct)
        .innerJoin(promotion, eq(promotionProduct.promotionId, promotion.id))
        .where(
            and(
                inArray(promotionProduct.productId, productIds),
                eq(promotion.isActive, true),
                sql`(${promotion.startsAt} IS NULL OR ${promotion.startsAt} <= ${now})`,
                sql`(${promotion.endsAt} IS NULL OR ${promotion.endsAt} >= ${now})`,
            ),
        );

    // берём «лучшую» по продукту: фикс-цена > макс % > самая свежая startsAt
    const best = new Map<string, PromoRow>();
    for (const r of rows) {
        const k = r.productId;
        const prev = best.get(k);
        if (!prev) {
            best.set(k, r);
            continue;
        }

        // сравнение приоритетов
        if (r.fixedPriceRub != null && prev.fixedPriceRub == null) {
            best.set(k, r);
            continue;
        }
        if (r.fixedPriceRub == null && prev.fixedPriceRub != null) {
            continue;
        }

        const rPct = num(r.percentOff);
        const pPct = num(prev.percentOff);
        if (rPct > pPct) {
            best.set(k, r);
            continue;
        }

        const rStart = r.startsAt ? +new Date(r.startsAt) : 0;
        const pStart = prev.startsAt ? +new Date(prev.startsAt) : 0;
        if (rStart > pStart) {
            best.set(k, r);
            continue;
        }
    }
    return best;
}

function computeEffectivePrice(basePrice: number, promo?: PromoRow): { effective: number; discountPercent: number | null } {
    if (!promo) return { effective: basePrice, discountPercent: null };
    if (promo.fixedPriceRub != null) {
        const eff = Math.max(0, num(promo.fixedPriceRub));
        const dp = basePrice > 0 ? round2((1 - eff / basePrice) * 100) : null;
        return { effective: eff, discountPercent: dp };
    }
    const pct = num(promo.percentOff);
    const eff = Math.max(0, basePrice * (1 - pct / 100));
    return { effective: round2(eff), discountPercent: pct || null };
}

/** ВАЖНО: customCashback в БД хранится как ПРОЦЕНТЫ (0..100) */
function computePvAndCashback(effectivePriceRub: number, row: ProductRow) {
    const pvEach = row.isPvEligible
        ? (row.customPv ?? Math.floor(effectivePriceRub / settlementSettingsRuntime.pvRubPerPv))
        : 0;

    const percent =
        row.customCashback != null
            ? num(row.customCashback) // уже проценты
            : settlementSettingsRuntime.vwcCashbackPercent; // проценты из конфига

    const cashbackRub = round2(effectivePriceRub * (percent / 100));
    return { pvEach, cashbackRub };
}

const publicCache = new TTLCache<{ items: PublicProductDTO[]; total: number }>();
const productBySlugCache = new TTLCache<AdminProductDTO>();

export const productService = {
    /** Публичный список (активные + активный UI), с поиском/сортом/категорией */
    async listPublic(params: ListParams = {}): Promise<{ items: PublicProductDTO[]; total: number }> {
        const { q, categoryId, categorySlug, limit = 20, offset = 0, sort = 'newest' } = params;

        const cacheKey = JSON.stringify({ q, categoryId, categorySlug, limit, offset, sort, v: 3 });
        const cached = publicCache.get(cacheKey);
        if (cached) return cached;

        const whereParts: any[] = [
            eq(product.status, 'active' as (typeof productStatusEnum.enumValues)[number]),
            eq(product.uiStatus, 'active' as (typeof uiStatusEnum.enumValues)[number]),
        ];

        if (q) {
            const qv = `%${q.trim()}%`;
            whereParts.push(sql`(${product.name} ILIKE ${qv} OR ${product.description} ILIKE ${qv})`);
        }
        if (categoryId) {
            whereParts.push(eq(product.categoryId, categoryId));
        }

        let orderBy: any = desc(product.createdAt);
        if (sort === 'price_asc') orderBy = asc(product.price);
        if (sort === 'price_desc') orderBy = desc(product.price);

        // ===== total (с optional join по slug) =====
        let total: number;
        if (categorySlug) {
            const totalRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(product)
                .innerJoin(category, eq(product.categoryId, category.id))
                .where(and(...whereParts, eq(category.slug, categorySlug)));
            total = Number(totalRes?.[0]?.count ?? 0);
        } else {
            const totalRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(product)
                .where((and as any)(...whereParts));
            total = Number(totalRes?.[0]?.count ?? 0);
        }

        // ===== rows (с optional join по slug) =====
        const baseSelect = db
            .select({
                id: product.id,
                slug: product.slug,
                name: product.name,
                stock: product.stock,
                price: product.price,
                isPvEligible: product.isPvEligible,
                customPv: product.customPv,
                customCashback: product.customCashback, // проценты
                images: product.images,
            })
            .from(product);

        const rows = (categorySlug
            ? await baseSelect
                .innerJoin(category, eq(product.categoryId, category.id))
                .where(and(...whereParts, eq(category.slug, categorySlug)))
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset)
            : await baseSelect
                .where((and as any)(...whereParts))
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset)) as unknown as ProductRow[];

        // промо по всем сразу
        const promosMap = PROMOTIONS_ENABLED ? await loadActivePromotions(rows.map((r) => r.id)) : new Map<string, PromoRow>();

        // первичные картинки батчом
        const primaryIds = rows.map((r) => pickPrimaryImageId(r.images)).filter(Boolean) as string[];
        const mediaMap = await batchResolveMediaUrls([...new Set(primaryIds)]);

        const items: PublicProductDTO[] = rows.map((r) => {
            const basePrice = num(r.price);
            const promo = promosMap.get(r.id);
            const { effective, discountPercent } = computeEffectivePrice(basePrice, promo);
            const { pvEach, cashbackRub } = computePvAndCashback(effective, r);

            const primaryId = pickPrimaryImageId(r.images);
            const primaryImageUrl = primaryId ? mediaMap.get(primaryId) ?? null : null;

            return {
                id: r.id,
                slug: r.slug,
                name: r.name,
                stock: r.stock,
                priceRub: round2(basePrice),
                effectivePriceRub: effective,
                discountPercent,
                pvEach,
                cashbackRub,
                primaryImageUrl,
            };
        });

        const payload = { items, total };
        publicCache.set(cacheKey, payload, 5);
        return payload;
    },

    /** Публичная карточка товара по slug (возвращает полную галерею) */
    async getPublicBySlug(slugValue: string): Promise<AdminProductDTO | null> {
        const cacheKey = `slug:${slugValue}`;
        const cached = productBySlugCache.get(cacheKey);
        if (cached) return cached;

        const [row] = (await db
            .select()
            .from(product)
            .where(
                and(
                    eq(product.slug, slugValue),
                    eq(product.status, 'active' as (typeof productStatusEnum.enumValues)[number]),
                    eq(product.uiStatus, 'active' as (typeof uiStatusEnum.enumValues)[number]),
                ),
            )
            .limit(1)) as unknown as ProductRow[];

        if (!row) return null;

        const dto = await this._toAdminDTO(row);
        productBySlugCache.set(cacheKey, dto, 10);
        return dto;
    },

    /** Админский список (без скрытия inactive/draft), те же фильтры поиска и сортировки */
    async listAdmin(params: ListParams = {}): Promise<{ items: AdminProductDTO[]; total: number }> {
        const { q, categoryId, categorySlug, limit = 50, offset = 0, sort = 'newest' } = params;

        const whereParts: any[] = [];
        if (q) {
            const qv = `%${q.trim()}%`;
            whereParts.push(sql`(${product.name} ILIKE ${qv} OR ${product.description} ILIKE ${qv})`);
        }
        if (categoryId) {
            whereParts.push(eq(product.categoryId, categoryId));
        }

        let orderBy: any = desc(product.createdAt);
        if (sort === 'price_asc') orderBy = asc(product.price);
        if (sort === 'price_desc') orderBy = desc(product.price);

        // total
        let total: number;
        if (categorySlug) {
            const totalRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(product)
                .innerJoin(category, eq(product.categoryId, category.id))
                .where(and(...whereParts, eq(category.slug, categorySlug)));
            total = Number(totalRes?.[0]?.count ?? 0);
        } else {
            const totalRes = await db.select({ count: sql<number>`count(*)` }).from(product).where((and as any)(...whereParts));
            total = Number(totalRes?.[0]?.count ?? 0);
        }

        // rows
        const baseSelect = db.select().from(product);
        const rows = (categorySlug
            ? await baseSelect
                .innerJoin(category, eq(product.categoryId, category.id))
                .where(and(...whereParts, eq(category.slug, categorySlug)))
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset)
            : await baseSelect
                .where((and as any)(...whereParts))
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset)) as unknown as ProductRow[];

        const promosMap = PROMOTIONS_ENABLED ? await loadActivePromotions(rows.map((r) => r.id)) : new Map<string, PromoRow>();

        // все mediaId из всех картинок сразу
        const allMediaIds = [
            ...new Set((rows.flatMap((r) => (Array.isArray(r.images) ? r.images.map((i) => i.mediaId) : [])) as string[]).filter(Boolean)),
        ];
        const mediaMap = await batchResolveMediaUrls(allMediaIds);

        const items: AdminProductDTO[] = rows.map((r) => this._composeAdminDTO(r, mediaMap, promosMap));
        return { items, total };
    },

    /** Админ: получить по id */
    async getAdminById(id: string): Promise<AdminProductDTO | null> {
        const [row] = (await db.select().from(product).where(eq(product.id, id)).limit(1)) as unknown as ProductRow[];
        if (!row) return null;
        return this._toAdminDTO(row);
    },

    /** Админ: создать (реальный insert) */
    async adminCreate(input: Omit<DBNewProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminProductDTO> {
        const patch = normalizeNumeric(input);

        // нормализуем images
        const images: ProductImageRef[] = Array.isArray((patch as any).images) ? (patch as any).images : [];
        (patch as any).images = images;

        // если нет slug — сгенерируем из name
        if (!(patch as any).slug && (patch as any).name) {
            (patch as any).slug = (patch as any).name
                .trim()
                .toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, '-')
                .replace(/^-+|-+$/g, '');
        }

        // Прямая FK: требуем categoryId (ответственность контроллера, но подстрахуемся)
        if (!(patch as any).categoryId) {
            throw new Error('categoryId is required');
        }

        const [row] = (await db.insert(product).values(patch as any).returning()) as unknown as ProductRow[];
        return this._toAdminDTO(row as any);
    },

    /** Админ: обновить (частично) */
    async adminUpdate(id: string, input: Partial<DBNewProduct>): Promise<AdminProductDTO | null> {
        const patch = normalizeNumeric(input);
        if ((patch as any).images) {
            const arr = Array.isArray((patch as any).images) ? (patch as any).images : [];
            (patch as any).images = arr;
        }

        const [row] = (await db
            .update(product)
            .set({ ...(patch as any), updatedAt: new Date() })
            .where(eq(product.id, id))
            .returning()) as unknown as ProductRow[];

        if (!row) return null;
        return this._toAdminDTO(row);
    },

    /** Вспомогательное: собрать Admin DTO (мета + галерея) */
    async _toAdminDTO(row: ProductRow): Promise<AdminProductDTO> {
        const promosMap = PROMOTIONS_ENABLED ? await loadActivePromotions([row.id]) : new Map<string, PromoRow>();
        const mediaMap = await batchResolveMediaUrls((row.images ?? []).map((i) => i.mediaId).filter(Boolean) as string[]);
        return this._composeAdminDTO(row, mediaMap, promosMap);
    },

    _composeAdminDTO(row: ProductRow, mediaMap: Map<string, string>, promosMap: Map<string, PromoRow>): AdminProductDTO {
        const basePrice = num(row.price);
        const promo = promosMap.get(row.id);
        const { effective, discountPercent } = computeEffectivePrice(basePrice, promo);
        const { pvEach, cashbackRub } = computePvAndCashback(effective, row);

        const sorted = sortImages(row.images ?? []);
        const gallery = sorted
            .map((img) => {
                const url = mediaMap.get(img.mediaId);
                return url ? { url, role: img.role, alt: img.alt, sortOrder: img.sortOrder } : null;
            })
            .filter(Boolean) as Array<{ url: string; role?: 'main' | 'gallery'; alt?: string; sortOrder?: number }>;

        const primaryImageUrl = (gallery.find((g) => g.role === 'main') ?? gallery[0])?.url ?? null;

        return {
            row: row as unknown as DBProduct,
            effectivePriceRub: effective,
            discountPercent,
            pvEach,
            cashbackRub,
            primaryImageUrl,
            gallery,
        };
    },
};

export default productService;
