// backend/drizzle/schema/products.ts
import {
    pgTable, uuid, text, varchar, integer, numeric, boolean, jsonb,
    index, uniqueIndex, check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { productStatusEnum, uiStatusEnum } from './enums';
import { category } from './categories'; // ← проверьте путь импорта

export type ProductImageItem = {
    mediaId: string;                 // Cloudinary public_id
    url: string;                     // Cloudinary secure_url
    role: 'main' | 'gallery';
    alt?: string | null;
    sortOrder: number;
};

export const product = pgTable('product', {
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),

    description: text('description'),
    longDescription: text('long_description'),
    seo_title: text('seo_title'),
    seo_description: text('seo_description'),

    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    originalPrice: numeric('original_price', { precision: 12, scale: 2 }),

    stock: integer('stock').notNull().default(0),
    sku: varchar('sku', { length: 100 }),

    // ← единичная категория (обязательная)
    categoryId: uuid('category_id')
        .notNull()
        .references(() => category.id, {
            onDelete: 'restrict',
            onUpdate: 'cascade',
        }),

    capsuleCount: integer('capsule_count'),
    capsuleVolume: text('capsule_volume'),
    servingsPerContainer: integer('servings_per_container'),
    manufacturer: text('manufacturer'),
    countryOfOrigin: text('country_of_origin'),
    expirationDate: text('expiration_date'),
    storageConditions: text('storage_conditions'),
    usage: text('usage'),
    additionalInfo: text('additional_info'),
    composition: jsonb('composition'),

    // ✅ НОВЫЕ ПОЛЯ (2025-11-20)
    seoKeywords: text('seo_keywords'),
    howToTake: text('how_to_take'),
    benefits: jsonb('benefits')
        .$type<string[]>()
        .default(sql`'[]'::jsonb`),

    isPvEligible: boolean('is_pv_eligible').notNull().default(true),
    customPv: integer('custom_pv'),
    customCashback: numeric('custom_cashback', { precision: 5, scale: 2 }),

    // единый источник истины по картинкам
    images: jsonb('images')
        .$type<ProductImageItem[]>()
        .notNull()
        .default(sql`'[]'::jsonb`),

    status:   productStatusEnum('status').notNull().default('draft'),
    uiStatus: uiStatusEnum('ui_status').notNull().default('active'),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    uqSlug: uniqueIndex('uq_product_slug').on(t.slug),

    // sku уникален только если указан
    uxSkuNullable: uniqueIndex('ux_product_sku_nullable')
        .on(t.sku)
        .where(sql`${t.sku} IS NOT NULL`),

    ixCategory: index('ix_product_category_id').on(t.categoryId),
    ixStatus:   index('ix_product_status').on(t.status),
    ixUi:       index('ix_product_ui_status').on(t.uiStatus),
    ixStatusUi: index('ix_product_status_ui').on(t.status, t.uiStatus),
    ixName:     index('ix_product_name').on(t.name),
    ixPrice:    index('ix_product_price').on(t.price),

    // sanity-checks
    chkPriceNonNeg: check('chk_product_price_nonneg', sql`${t.price} >= 0`),
    chkStockNonNeg: check('chk_product_stock_nonneg', sql`${t.stock} >= 0`),
    chkPvNonNeg:    check('chk_product_custom_pv_nonneg', sql`${t.customPv} IS NULL OR ${t.customPv} >= 0`),
    chkCashback01:  check(
        'chk_product_cashback_0_100',
        sql`${t.customCashback} IS NULL OR (${t.customCashback} >= 0 AND ${t.customCashback} <= 100)`
    ),
}));

export type Product    = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
