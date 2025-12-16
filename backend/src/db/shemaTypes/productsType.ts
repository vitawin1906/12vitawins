import { z } from 'zod';
import { uuid, timestamp, slug } from './commonsType';
import { ProductStatus, UiStatus, HowToTake } from './enumsType';

// Схема для метаданных изображения
export const ProductImageMetadata = z.object({
    mediaId: z.string().url(), // Cloudinary URL
    role: z.enum(['main', 'gallery']),
    alt: z.string().optional(),
    sortOrder: z.number().int().min(0),
});
export type ProductImageMetadata = z.infer<typeof ProductImageMetadata>;

// ====== БАЗОВЫЙ DTO (источник правды и для фронта, и для бэка) ======
export const ProductDto = z.object({
    id: uuid,

    name: z.string().min(2),
    slug: slug,

    description: z.string().optional(),
    longDescription: z.string().optional(),

    price: z.coerce.number().nonnegative(),
    originalPrice: z.coerce.number().nonnegative().optional().nullable(),

    // ✅ одна категория
    categoryId: uuid,

    // Массив объектов с метаданными изображений или простые URL-ы
    images: z.union([
        z.array(ProductImageMetadata),
        z.array(z.string().url())
    ]).optional(),

    isPvEligible: z.boolean().default(true),
    customPv: z.number().int().min(0).optional(),
    // В API — доля 0..1 (проценты фронт может хранить отдельно)
    customCashback: z.number().min(0).max(1).optional(),

    composition: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return val;
                }
            }
            return val;
        },
        z.record(z.string(), z.any()).optional()
    ),

    status: ProductStatus,        // жизненный цикл
    uiStatus: UiStatus,           // видимость в UI

    stock: z.number().int().min(0).default(0),
    sku: z.string().max(100).optional(),

    capsuleCount: z.number().int().min(0).optional(),
    capsuleVolume: z.string().optional(),
    servingsPerContainer: z.number().int().min(0).optional(),
    manufacturer: z.string().optional(),
    countryOfOrigin: z.string().optional(),
    expirationDate: z.string().optional(),       // ISO-строка даты
    storageConditions: z.string().optional(),
    usage: z.string().optional(),
    additionalInfo: z.string().optional(),

    howToTake: HowToTake.optional(),
    benefits: z.array(z.string()).optional(),

    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    seoKeywords: z.string().optional(),

    createdAt: timestamp,
    updatedAt: timestamp,
});
export type ProductDto = z.infer<typeof ProductDto>;

// CREATE: сервер ставит id/status/timestamps
export const ProductCreateDto = ProductDto.omit({
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    // на создание разрешаем массив объектов метаданных или простые URL-ы
    images: z.union([
        z.array(ProductImageMetadata),
        z.array(z.string().url())
    ]).optional(),
});
export type ProductCreateDto = z.infer<typeof ProductCreateDto>;

// UPDATE (body): частичный; без id в body
export const ProductUpdateDto = ProductCreateDto.partial()
    .refine((obj) => Object.keys(obj).length > 0, 'Body must not be empty');
export type ProductUpdateDto = z.infer<typeof ProductUpdateDto>;

// ====== Params / Query ======
export const ProductIdParamDto = z.object({ id: uuid });
export type ProductIdParamDto = z.infer<typeof ProductIdParamDto>;

export const ProductSlugParamDto = z.object({ slug });
export type ProductSlugParamDto = z.infer<typeof ProductSlugParamDto>;

// ✅ Поиск исключительно по categoryId
export const ProductListQueryDto = z.object({
    q: z.string().trim().optional(),
    status: ProductStatus.optional(),
    uiStatus: UiStatus.optional(),
    inStock: z.coerce.boolean().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    orderBy: z.enum(['createdAt','price','name']).optional(),
    orderDir: z.enum(['asc','desc']).optional(),
    categoryId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
export type ProductListQueryDto = z.infer<typeof ProductListQueryDto>;

// ====== Вариант для ФОРМЫ (удобно на фронте): проценты 0..100 и непустая хотя бы одна картинка ======
export const ProductFormSchema = ProductCreateDto.extend({
    // в форме cashback как проценты (0..100)
    customCashbackPercent: z.number().min(0).max(100).optional(),
    // ✅ требуем выбрать категорию в форме
    categoryId: uuid,
})
    .omit({ customCashback: true })
    .superRefine((val, ctx) => {
        if (!val.images || val.images.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: 'Нужно минимум одно изображение' });
        }
    });
export type ProductFormSchema = z.infer<typeof ProductFormSchema>;

// Мапперы форма → API и обратно
export function formToApi(input: ProductFormSchema): ProductCreateDto {
    const { customCashbackPercent, ...rest } = input as any;
    return {
        ...rest,
        customCashback:
            typeof customCashbackPercent === 'number'
                ? Number((customCashbackPercent / 100).toFixed(4))
                : undefined,
    };
}

export function apiToForm(input: ProductDto): ProductFormSchema {
    const { customCashback, ...rest } = input as any;
    return {
        ...rest,
        customCashbackPercent:
            typeof customCashback === 'number'
                ? Math.round(customCashback * 100 * 100) / 100 // 2 знака
                : undefined,
    };
}