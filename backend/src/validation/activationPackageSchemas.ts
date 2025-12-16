// backend/src/validation/activationPackageSchemas.ts
import { z } from 'zod';

/**
 * Zod validation schemas for Activation Package endpoints
 */

/**
 * Покупка пакета Partner (7500 RUB)
 */
export const PurchasePartnerSchema = z.object({
    body: z.object({
        // Пока без дополнительных полей, userId берется из auth middleware
    }).optional(),
});

/**
 * Покупка пакета Partner Pro (30000 RUB)
 */
export const PurchasePartnerProSchema = z.object({
    body: z.object({
        // Пока без дополнительных полей, userId берется из auth middleware
    }).optional(),
});

/**
 * Upgrade Partner → Partner Pro
 */
export const UpgradeToPartnerProSchema = z.object({
    body: z.object({
        // Пока без дополнительных полей, userId берется из auth middleware
    }).optional(),
});

/**
 * Получить пакеты пользователя (query параметры)
 */
export const GetUserPackagesSchema = z.object({
    query: z.object({
        userId: z.string().uuid().optional(), // Если admin запрашивает
    }).optional(),
});

/**
 * Admin: получить все пакеты
 */
export const GetAllPackagesSchema = z.object({
    query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
    }).optional(),
});

/**
 * Admin: проверка права на upgrade
 */
export const CheckUpgradeEligibilitySchema = z.object({
    params: z.object({
        userId: z.string().uuid(),
    }),
});

/**
 * Response types (для документации)
 */

export const ActivationPackageResponse = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    type: z.enum(['partner', 'partner_pro']),
    amountRub: z.string(),
    createdAt: z.string().datetime(),
});

export const PackageStatsResponse = z.object({
    partner: z.number().int().nonnegative(),
    partnerPro: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
});

export const UpgradeEligibilityResponse = z.object({
    canUpgrade: z.boolean(),
    reason: z.string().optional(),
    deadline: z.string().datetime().optional(),
});
