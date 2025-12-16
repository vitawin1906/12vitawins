// contracts/src/schema/category.ts
import { z } from "zod";
import { UiStatus } from "./enumsType"; // ← было UiStatus, должно быть CategoryStatus (UDT: category_status)

export const CategoryId = z.string().uuid();

export const CategoryCreate = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).max(255), // UQ по БД
    description: z.string().optional().nullable(),
    status: UiStatus.default("active"), // default из БД
    seoTitle: z.string().optional().nullable(),
    seoDescription: z.string().optional().nullable(),
});

export const CategoryUpdate = CategoryCreate.partial();

export const CategoryView = z.object({
    id: CategoryId,
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    status: UiStatus,
    createdAt: z.string(), // timestamptz ISO
    updatedAt: z.string(),
    seoTitle: z.string().nullable(),
    seoDescription: z.string().nullable(),
});

export const CategoryListQuery = z.object({
    q: z.string().optional(),
    status: UiStatus.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    orderBy: z.enum(["name_asc","name_desc","created_desc","created_asc"]).default("name_asc")
});

export const PagedMeta = z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    page: z.number().int(),
    totalPages: z.number().int(),
});

export const CategoryListResponse = z.object({
    items: z.array(CategoryView),
    meta: PagedMeta,
    success: z.literal(true),
});