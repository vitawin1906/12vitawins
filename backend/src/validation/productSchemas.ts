// backend/src/validation/productSchemas.ts
import { z } from 'zod';

/**
 * Product Creation Schema
 */
export const createProductSchema = z.object({
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    priceRub: z.number().positive(),
    categoryId: z.string().uuid().optional(),
    sku: z.string().optional(),
    stock: z.number().int().nonnegative().default(0),
    isPvEligible: z.boolean().default(true),
    isActive: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
    images: z.array(z.string().url()).optional(),
});

/**
 * Product Update Schema
 */
export const updateProductSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    priceRub: z.number().positive().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    sku: z.string().optional(),
    stock: z.number().int().nonnegative().optional(),
    isPvEligible: z.boolean().optional(),
    isActive: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    images: z.array(z.string().url()).optional(),
});

/**
 * Product Query Schema
 */
export const productQuerySchema = z.object({
    q: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    isPvEligible: z.boolean().optional(),
    isActive: z.boolean().optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    limit: z.number().int().positive().max(100).default(20).optional(),
    offset: z.number().int().nonnegative().default(0).optional(),
    sortBy: z.enum(['name', 'priceRub', 'createdAt', 'stock']).default('createdAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
