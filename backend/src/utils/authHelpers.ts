// backend/src/utils/authHelpers.ts

import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";

// JWT secrets with type safety
const JWT_SECRET: Secret =
    process.env.JWT_SECRET || "vitawin_jwt_secret_key_production_2025_secure";

const JWT_REFRESH_SECRET: Secret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    "vitawin_jwt_refresh_secret_key_2025";

/* ---------------- Types ---------------- */

/**
 * JWT Token Payload (Registry v0.4.1)
 * - id: UUID (primary identity)
 * - isAdmin: required boolean
 * - telegramId: optional (may be null)
 */
export interface TokenPayload {
    id: string;
    isAdmin: boolean;
    telegramId?: string | null;
}


/* ---------------- Signing ---------------- */

export function signAccessToken(
    payload: TokenPayload,
    expiresIn: string = "1d"
): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function signRefreshToken(payload: { id: string }): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "30d" as any });
}


/* ---------------- Cookies ---------------- */

interface CookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    maxAge: number;
    path?: string;
}

function getCookieOptions(maxAgeDays: number): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
        path: "/",
    };
}

export function setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    accessTokenDays: number = 1
): void {
    res.cookie("authToken", accessToken, getCookieOptions(accessTokenDays));
    res.cookie("refreshToken", refreshToken, getCookieOptions(30));
}

export function clearAuthCookies(res: Response): void {
    res.clearCookie("authToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
}

/* ---------------- Verification ---------------- */

export function verifyRefreshToken(token: string): { id: string } {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
}

/**
 * Create JWT token for user (simplified version for OAuth flows)
 * @param userId - User ID
 * @param expiresIn - Token expiration (default: 1d)
 */
export function createJWT(userId: string, expiresIn: string = "1d"): string {
    return jwt.sign({ id: userId, isAdmin: false }, JWT_SECRET, { expiresIn: expiresIn as any });
}

/**
 * Create full JWT payload from user data (Registry v0.4.1)
 */
export function createTokenPayload(user: {
    id: string;
    isAdmin: boolean;
    telegramId?: string | null;
}): TokenPayload {
    return {
        id: user.id,
        isAdmin: user.isAdmin,
        telegramId: user.telegramId || null,
    };
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
