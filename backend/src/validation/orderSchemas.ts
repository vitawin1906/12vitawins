// backend/src/validation/orderSchemas.ts
import { z } from 'zod';

/**
 * Order Creation Schema
 * Used when user creates a new order
 */
export const createOrderSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string().uuid(),
            qty: z.number().int().positive(),
        })
    ).min(1, 'Order must have at least one item'),
    promoCode: z.string().optional(),
    deliveryRequired: z.boolean().default(false),
    deliveryAddressId: z.string().uuid().optional(),
    deliveryService: z.string().optional(),
    comment: z.string().max(500).optional(),
});

/**
 * Order Update Schema (Admin)
 */
export const updateOrderSchema = z.object({
    status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'canceled', 'returned_partial', 'returned_full']).optional(),
    deliveryTrackingCode: z.string().optional(),
    deliveryStatus: z.enum(['not_required', 'pending', 'shipped', 'delivered', 'failed']).optional(),
    comment: z.string().max(500).optional(),
});

/**
 * Order Query Schema
 */
export const orderQuerySchema = z.object({
    status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'canceled', 'returned_partial', 'returned_full']).optional(),
    userId: z.string().uuid().optional(),
    limit: z.number().int().positive().max(100).default(20).optional(),
    offset: z.number().int().nonnegative().default(0).optional(),
    sortBy: z.enum(['createdAt', 'totalPayableRub', 'status']).default('createdAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
