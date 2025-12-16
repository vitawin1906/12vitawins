// backend/src/validation/userSchemas.ts
import { z } from 'zod';

/**
 * User Registration Schema
 */
export const registerUserSchema = z.object({
    telegramId: z.string().optional(),
    googleId: z.string().optional(),
    email: z.string().email().optional(),
    username: z.string().min(3).max(50).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    referralCode: z.string().length(8).optional(), // Applied referral code
    password: z.string().min(8).optional(), // For email/password registration
});

/**
 * User Update Schema
 */
export const updateUserSchema = z.object({
    username: z.string().min(3).max(50).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatarMediaId: z.string().uuid().nullable().optional(),
    option3Enabled: z.boolean().optional(),
    canReceiveFirstlineBonus: z.boolean().optional(),
    freedomShares: z.tuple([
        z.number().min(0).max(100),
        z.number().min(0).max(100),
        z.number().min(0).max(100),
        z.number().min(0).max(100),
    ]).optional(),
});

/**
 * User Query Schema (Admin)
 */
export const userQuerySchema = z.object({
    q: z.string().optional(),
    mlmStatus: z.enum(['customer', 'partner', 'partner_pro']).optional(),
    isActive: z.boolean().optional(),
    rank: z.string().optional(),
    referrerId: z.string().uuid().optional(),
    limit: z.number().int().positive().max(100).default(20).optional(),
    offset: z.number().int().nonnegative().default(0).optional(),
    sortBy: z.enum(['createdAt', 'firstName', 'mlmStatus', 'balance']).default('createdAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
