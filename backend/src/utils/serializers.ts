// backend/src/utils/serializers.ts
/**
 * Response serializers for consistent API data formatting
 * Maintains exact data transformation logic from controllers
 */

import type { AppUser } from '#db/schema/users';

/**
 * User response data structure
 * Used across all auth endpoints
 */
export interface SerializedUser {
    id: string;
    telegramId: string | null;
    firstName: string | null;
    username: string | null;
    email?: string | null;
    phone?: string | null;
    referralCode: string | null;
    appliedReferralCode: string | null;
    balance: number;
    isAdmin: boolean;
    mlmStatus: string | null;
    rank: string | null;
    isActive: boolean;
    createdAt?: Date;
}

/**
 * Serializes user database record to safe API response format
 * Converts balance from string to number, hides email_ prefix from telegramId
 * @param user - User database record
 * @param options - Optional fields to include (email, phone, createdAt)
 * @returns Formatted user object for API response
 */
export function serializeUser(
    user: AppUser,
    options: { includeEmail?: boolean; includePhone?: boolean; includeCreatedAt?: boolean } = {}
): SerializedUser {
    const rawTelegramId = user.telegramId ?? null;

    const serialized: SerializedUser = {
        id: user.id,

        telegramId: rawTelegramId && rawTelegramId.startsWith
            ? (rawTelegramId.startsWith('email_') ? null : rawTelegramId)
            : null,
        firstName: user.firstName,
        username: user.username,
        referralCode: user.referralCode,
        appliedReferralCode: user.appliedReferralCode,
        balance: parseFloat(user.balance ?? '0'),
        isAdmin: user.isAdmin,
        mlmStatus: user.mlmStatus,
        rank: user.rank,
        isActive: user.isActive,
    };

    if (options.includeEmail) {
        serialized.email = user.email;
    }

    if (options.includePhone) {
        serialized.phone = user.phone;
    }

    if (options.includeCreatedAt) {
        serialized.createdAt = user.createdAt;
    }

    return serialized;
}

/**
 * Serializes user for Telegram-based authentication responses
 * Excludes email and phone for security
 * @param user - User database record
 * @returns Minimal user object for Telegram auth
 */
export function serializeTelegramUser(user: AppUser): SerializedUser {
    return serializeUser(user, { includeEmail: false, includePhone: false });
}

/**
 * Serializes user for email/password authentication responses
 * Includes email and phone fields
 * @param user - User database record
 * @returns Full user object for email auth
 */
export function serializeEmailUser(user: AppUser): SerializedUser {
    return serializeUser(user, { includeEmail: true, includePhone: true });
}

/**
 * Serializes user for /me endpoint responses
 * Includes createdAt timestamp
 * @param user - User database record
 * @returns User object with creation date
 */
export function serializeCurrentUser(user: AppUser): SerializedUser {
    return serializeUser(user, { includeCreatedAt: true });
}
