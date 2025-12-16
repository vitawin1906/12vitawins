// backend/src/validation/commonSchemas.ts
/**
 * Shared Zod validation schemas
 * Prevents duplication across controller files
 * Maintains consistent validation logic across all endpoints
 */

import { z } from 'zod';

/* ───────────────── Common Parameter Schemas ───────────────── */

/**
 * UUID parameter validation
 * Used in routes like /api/resource/:id
 */
export const IdParam = z.object({
    id: z.string().uuid(),
});

/**
 * Slug parameter validation
 * Used in routes like /api/resource/:slug
 */
export const SlugParam = z.object({
    slug: z.string().min(1),
});

/**
 * URL or ID parameter validation
 * Flexible matcher for custom URL or UUID
 */
export const UrlOrIdParam = z.object({
    urlOrId: z.string().min(1),
});

/* ───────────────── Pagination & List Schemas ───────────────── */

/**
 * Standard pagination parameters
 * limit: 1-100 items (default: 20)
 * offset: starting position (default: 0)
 */
export const PaginationQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Search query parameter
 * Used for text search across resources
 */
export const SearchQuery = z.object({
    q: z.string().optional(),
    search: z.string().optional(),
});

/**
 * Ordering parameters
 * orderBy: field name
 * orderDir: asc or desc
 */
export const OrderQuery = z.object({
    orderBy: z.string().optional(),
    orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Combined list query parameters
 * Includes pagination, search, and ordering
 */
export const ListQuery = PaginationQuery.merge(SearchQuery).merge(OrderQuery);

/* ───────────────── Status Filter Schemas ───────────────── */

/**
 * Generic status filter
 * Used across products, orders, posts
 */
export const StatusQuery = z.object({
    status: z.string().optional(),
});

/**
 * Active/inactive filter
 */
export const ActiveQuery = z.object({
    isActive: z.coerce.boolean().optional(),
});

/* ───────────────── Date Range Schemas ───────────────── */

/**
 * Date range filtering
 * Supports startDate and endDate parameters
 */
export const DateRangeQuery = z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

/* ───────────────── Auth Schemas ───────────────── */

/**
 * Email validation
 * Standard email format check
 */
export const EmailSchema = z.string().email();

/**
 * Password validation
 * Minimum 6 characters
 */
export const PasswordSchema = z.string().min(6);

/**
 * Email + Password login
 */
export const EmailPasswordSchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
});

/**
 * Telegram ID validation
 * Accepts string or number, converts to string
 */
export const TelegramIdSchema = z.union([z.string(), z.number()]).transform((v) => String(v));

/* ───────────────── Numeric & Money Schemas ───────────────── */

/**
 * Positive number validation
 * Used for prices, quantities, etc.
 */
export const PositiveNumber = z.number().positive();

/**
 * Non-negative number validation
 * Allows zero (for discounts, free items)
 */
export const NonNegativeNumber = z.number().min(0);

/**
 * Money amount validation
 * Accepts number or string, converts to number with 2 decimals
 */
export const MoneyAmount = z.union([z.number(), z.string()])
    .transform((v) => typeof v === 'string' ? parseFloat(v) : v)
    .pipe(NonNegativeNumber);

/**
 * Percentage validation (0-100)
 * Used for discounts, cashback, etc.
 */
export const PercentageSchema = z.number().min(0).max(100);

/* ───────────────── Common Field Schemas ───────────────── */

/**
 * Non-empty string validation
 * Trims whitespace and ensures at least 1 character
 */
export const NonEmptyString = z.string().trim().min(1);

/**
 * Optional non-empty string
 * Either undefined or a non-empty string
 */
export const OptionalNonEmptyString = z.string().trim().min(1).optional();

/**
 * Phone number validation
 * Basic format check
 */
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

/**
 * URL validation
 */
export const UrlSchema = z.string().url();

/**
 * Optional URL validation
 */
export const OptionalUrlSchema = z.string().url().optional();
