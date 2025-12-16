// backend/src/validation/promoCodeSchemas.ts
import { z } from 'zod';

/**
 * Promo Code Creation Schema
 */
export const createPromoCodeSchema = z.object({
    code: z.string().min(3).max(50).toUpperCase(),
    discountType: z.enum(['fixed_amount', 'percentage', 'free_shipping']),
    discountValue: z.number().positive(),
    minOrderAmount: z.number().nonnegative().default(0).optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().positive().default(1).optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().default(true),
    description: z.string().max(200).optional(),
});

/**
 * Promo Code Update Schema
 */
export const updatePromoCodeSchema = z.object({
    discountType: z.enum(['fixed_amount', 'percentage', 'free_shipping']).optional(),
    discountValue: z.number().positive().optional(),
    minOrderAmount: z.number().nonnegative().optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().positive().optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
    description: z.string().max(200).optional(),
});

/**
 * Apply Promo Code Schema
 */
export const applyPromoCodeSchema = z.object({
    code: z.string().min(3).max(50).toUpperCase(),
    orderTotal: z.number().positive(),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type ApplyPromoCodeInput = z.infer<typeof applyPromoCodeSchema>;
