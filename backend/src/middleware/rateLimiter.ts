// backend/src/middleware/rateLimiter.ts
/**
 * Rate limiting middleware to protect against brute force attacks
 * Uses express-rate-limit for production-ready rate limiting
 */

import rateLimit from 'express-rate-limit';

/**
 * Standard rate limiter for authentication endpoints
 * Allows 5 attempts per 15 minutes per IP
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window per IP
    message: {
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Stricter rate limiter for admin authentication
 * Allows only 3 attempts per 15 minutes
 * Admin endpoints are more sensitive
 */
export const adminAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per window
    message: {
        success: false,
        error: 'TOO_MANY_ADMIN_LOGIN_ATTEMPTS',
        message: 'Too many admin login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for password reset endpoints
 * Prevents abuse of password reset functionality
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: {
        success: false,
        error: 'TOO_MANY_RESET_ATTEMPTS',
        message: 'Too many password reset attempts. Please try again in 1 hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter for public endpoints
 * Prevents API abuse from anonymous users
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for authenticated users
    skip: (req) => !!req.user,
});

/**
 * Rate limiter for order creation
 * Prevents order spam
 */
export const orderCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 orders per hour
    message: {
        success: false,
        error: 'TOO_MANY_ORDERS',
        message: 'Too many orders created. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for review submission
 * Prevents review spam
 */
export const reviewLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 reviews per day
    message: {
        success: false,
        error: 'TOO_MANY_REVIEWS',
        message: 'Too many reviews submitted. Please try again tomorrow.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Backward compatibility: export old createRateLimit function
 * @deprecated Use specific limiters instead (authLimiter, adminAuthLimiter, etc.)
 */
export function createRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
    return rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            success: false,
            error: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
}