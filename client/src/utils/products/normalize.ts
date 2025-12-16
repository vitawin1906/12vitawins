/**
 * Product normalization utilities
 *
 * КРИТИЧЕСКИ ВАЖНО:
 * - Backend хранит customCashback как ПРОЦЕНТЫ (0..100) в БД NUMERIC(5,2)
 * - Frontend работает с customCashback как ДОЛИ (0..1)
 * - Эти утилиты выполняют преобразование между форматами
 *
 * Пример:
 * - БД: 5.00 (5 процентов)
 * - API → Frontend: 5.00 / 100 = 0.05 (доля)
 * - Frontend → API: 0.05 * 100 = 5.00 (проценты)
 */

import type { Product } from '@/store/api/domains/productsApi';

/**
 * Логирование для отладки (включено только в dev режиме)
 */
const DEBUG = import.meta.env.DEV;

function log(label: string, data: any) {
    if (DEBUG) {

    }
}

/**
 * Нормализует данные товара с бэкенда для использования на фронтенде
 *
 * Ключевые преобразования:
 * 1. customCashback: ПРОЦЕНТЫ (0..100) → ДОЛИ (0..1)
 *    Пример: 5.00 (БД) → 0.05 (фронт) = 5%
 *
 * 2. images: гарантируем массив объектов с правильной структурой
 *
 * 3. Числовые поля: преобразуем строки в числа где необходимо
 *
 * 4. category: обрабатываем JOIN объект {id, name, slug}
 *
 * @param raw - сырые данные с бэкенда (после baseQuery camelCase transform)
 * @returns нормализованный объект Product для фронтенда
 */
export function normalizeProductFromApi(raw: any): Product {
    if (!raw) {
        throw new Error('normalizeProductFromApi: raw data is null/undefined');
    }

    log('RAW from backend', raw);

    // ═══════════ КРИТИЧНО: Нормализация customCashback ═══════════
    // Backend отдает ПРОЦЕНТЫ (0..100), конвертируем в ДОЛИ (0..1)
    let normalizedCashback: number | null = null;
    if (raw.customCashback != null) {
        const rawValue = Number(raw.customCashback);
        if (isNaN(rawValue)) {
            console.warn('[normalizeProduct] Invalid customCashback value:', raw.customCashback);
        } else {
            // Делим на 100: 5.00 → 0.05 (5%)
            normalizedCashback = Number((rawValue / 100).toFixed(4));
        }
    }

    // ═══════════ Нормализация images ═══════════
    // Гарантируем массив с правильной структурой
    let normalizedImages: Product['images'] = [];
    if (Array.isArray(raw.images)) {
        normalizedImages = raw.images.map((img: any, index: number) => ({
            mediaId: String(img.mediaId || img.url || ''),
            role: (img.role === 'gallery' ? 'gallery' : 'main') as 'main' | 'gallery',
            alt: img.alt || undefined,
            sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : index,
        }));
    }

    // ═══════════ Нормализация category ═══════════
    // Backend возвращает JOIN объект после attachCategory()
    let normalizedCategory: Product['category'] = null;
    if (raw.category && typeof raw.category === 'object') {
        normalizedCategory = {
            id: String(raw.category.id),
            name: String(raw.category.name),
            slug: String(raw.category.slug),
        };
    }

    // ═══════════ Основная нормализация ═══════════
    const normalized: Product = {
        // Базовые поля
        id: String(raw.id),
        name: String(raw.name || ''),
        slug: String(raw.slug || raw.id),
        title: raw.title || raw.name, // legacy alias
        description: raw.description || undefined,
        longDescription: raw.longDescription || undefined,

        // Цены (гарантируем числа)
        price: Number(raw.price) || 0,
        originalPrice: raw.originalPrice != null ? Number(raw.originalPrice) : null,

        // Категория (объект после JOIN)
        categoryId: String(raw.categoryId),
        category: normalizedCategory,

        // Изображения (нормализованный массив)
        images: normalizedImages,

        // ═══ БОНУСЫ (КРИТИЧНО!) ═══
        isPvEligible: raw.isPvEligible ?? true,
        customPv: raw.customPv != null ? Number(raw.customPv) : null,
        customCashback: normalizedCashback, // ← ДОЛИ (0..1) после конвертации!

        // Состав и инструкции
        composition: raw.composition || undefined,
        usage: raw.usage || undefined,
        additionalInfo: raw.additionalInfo || undefined,
        capsuleCount: raw.capsuleCount != null ? Number(raw.capsuleCount) : undefined,
        capsuleVolume: raw.capsuleVolume || undefined,
        servingsPerContainer: raw.servingsPerContainer != null ? Number(raw.servingsPerContainer) : undefined,
        manufacturer: raw.manufacturer || undefined,
        countryOfOrigin: raw.countryOfOrigin || undefined,
        expirationDate: raw.expirationDate || undefined,
        storageConditions: raw.storageConditions || undefined,
        howToTake: raw.howToTake || undefined,

        // Склад и статусы
        stock: Number(raw.stock) || 0,
        sku: raw.sku || undefined,
        status: raw.status || 'draft',
        uiStatus: raw.uiStatus || 'active',

        // SEO
        seoTitle: raw.seoTitle || undefined,
        seoDescription: raw.seoDescription || undefined,
        seoKeywords: raw.seoKeywords || undefined,

        // Польза товара (JSONB массив строк)
        benefits: Array.isArray(raw.benefits) ? raw.benefits : undefined,

        // Legacy поля для обратной совместимости
        badge: raw.badge || undefined,
        rating: raw.rating != null ? Number(raw.rating) : undefined,
        reviews: raw.reviews != null ? Number(raw.reviews) : undefined,

        // Timestamps
        createdAt: raw.createdAt || undefined,
        updatedAt: raw.updatedAt || undefined,
    };

    log('NORMALIZED for frontend', {
        ...normalized,
        customCashback: `${normalized.customCashback} (${normalized.customCashback ? normalized.customCashback * 100 : 0}%)`,
    });

    return normalized;
}

/**
 * Денормализует данные товара для отправки на бэкенд
 *
 * Ключевые преобразования:
 * 1. customCashback: ДОЛИ (0..1) → ПРОЦЕНТЫ (0..100)
 *    Пример: 0.05 (фронт) → 5.00 (БД) = 5%
 *
 * 2. Удаляем поля, которые не нужны на бэкенде (category объект, legacy поля, readonly)
 *
 * @param product - данные товара с фронтенда
 * @returns объект для отправки на бэкенд API
 */
export function denormalizeProductToApi(product: Partial<Product>): any {
    log('DENORMALIZE input', product);

    // ═══════════ КРИТИЧНО: Денормализация customCashback ═══════════
    // Frontend отправляет ДОЛИ (0..1), конвертируем в ПРОЦЕНТЫ (0..100)
    let denormalizedCashback: number | null | undefined = undefined;
    if (product.customCashback !== undefined) {
        if (product.customCashback === null) {
            denormalizedCashback = null;
        } else {
            const cashbackValue = Number(product.customCashback);
            if (isNaN(cashbackValue)) {
                console.warn('[denormalizeProduct] Invalid customCashback:', product.customCashback);
            } else {
                // Умножаем на 100: 0.05 → 5.00 (5%)
                denormalizedCashback = Number((cashbackValue * 100).toFixed(2));
            }
        }
    }

    // ═══════════ Удаляем поля, которые НЕ отправляем ═══════════
    const {
        category,      // JOIN объект - не отправляем (отправляем только categoryId)
        title,         // legacy alias для name
        badge,         // legacy
        rating,        // legacy
        reviews,       // legacy
        createdAt,     // readonly
        updatedAt,     // readonly
        customCashback, // заменяем на денормализованный
        ...restProduct
    } = product;

    const denormalized = {
        ...restProduct,
        customCashback: denormalizedCashback, // ← ПРОЦЕНТЫ (0..100) после конвертации!
    };

    log('DENORMALIZED for backend', {
        ...denormalized,
        customCashback: denormalizedCashback != null ? `${denormalizedCashback}%` : null,
    });

    return denormalized;
}

/**
 * Type alias для понятности кода
 */
export type UiProduct = Product;

/**
 * Вспомогательная функция для нормализации массива товаров
 * Используется в transformResponse для списков
 */
export function normalizeProductsFromApi(rawArray: any[]): Product[] {
    if (!Array.isArray(rawArray)) {
        console.warn('[normalizeProducts] Expected array, got:', typeof rawArray);
        return [];
    }

    return rawArray.map((raw, index) => {
        try {
            return normalizeProductFromApi(raw);
        } catch (error) {
            console.error(`[normalizeProducts] Error normalizing item at index ${index}:`, error, raw);
            // Пропускаем невалидные записи вместо краша всего приложения
            return null;
        }
    }).filter((p): p is Product => p !== null);
}
