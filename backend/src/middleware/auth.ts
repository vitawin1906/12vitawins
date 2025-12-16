// backend/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { usersStorage } from '#storage/usersStorage';
import type { AppUser } from '#db/schema/users';

/* ────────────────────────────────────────
   Расширяем Express Request
──────────────────────────────────────── */
declare global {
    namespace Express {
        interface Request {
            user?: AppUser;
            admin?: { id: string; email: string };
            cookies?: Record<string, unknown>;
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET missing!');
    throw new Error('JWT_SECRET must be defined');
}

/* ────────────────────────────────────────
   JWT Types — упрощены под Registry
   Теперь JWT = только { id, isAdmin }
──────────────────────────────────────── */
export interface JWTPayload {
    id: string;
    isAdmin: boolean;

    iat?: number;
    exp?: number;
}

/** Формат входных данных для токена */
export type JWTInput = {
    id: string;
    isAdmin: boolean;
};

/* ────────────────────────────────────────
   Генерация JWT
──────────────────────────────────────── */
export function generateJWT(payload: JWTInput): string {
    return jwt.sign(
        { id: payload.id, isAdmin: payload.isAdmin },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/* ────────────────────────────────────────
   Верификация JWT
──────────────────────────────────────── */
export function verifyJWT(token: string): JWTPayload {
    const decoded = jwt.verify(token, JWT_SECRET);
    const p = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;

    return {
        id: String(p.id),
        isAdmin: Boolean(p.isAdmin),
        iat: typeof p.iat === 'number' ? p.iat : undefined,
        exp: typeof p.exp === 'number' ? p.exp : undefined,
    };
}

/* ────────────────────────────────────────
   Обязательная авторизация
──────────────────────────────────────── */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
        if (!token && req.cookies?.authToken) token = String(req.cookies.authToken);

        if (!token) {
            return res.status(401).json({ error: 'NO_TOKEN', message: 'Please log in again.' });
        }

        try {
            const payload = verifyJWT(token);

            const user = await usersStorage.getUserById(payload.id);

            if (!user || !user.isActive) {
                return res.status(401).json({ error: 'USER_NOT_FOUND' });
            }

            req.user = user;
            next();
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: 'TOKEN_EXPIRED' });
            }
            return res.status(401).json({ error: 'INVALID_TOKEN' });
        }
    } catch (error) {
        console.error('authMiddleware error:', error);
        res.status(500).json({ error: 'AUTH_FAILED' });
    }
}

/* ────────────────────────────────────────
   Админ-права
──────────────────────────────────────── */
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' });
        if (!req.user.isAdmin) return res.status(403).json({ error: 'FORBIDDEN' });

        next();
    } catch (error) {
        console.error('adminMiddleware error:', error);
        res.status(500).json({ error: 'ADMIN_CHECK_FAILED' });
    }
}

/* ────────────────────────────────────────
   Необязательная авторизация
──────────────────────────────────────── */
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    try {
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
        if (!token && req.cookies?.authToken) token = String(req.cookies.authToken);

        if (token) {
            try {
                const payload = verifyJWT(token);
                const user = await usersStorage.getUserById(payload.id);
                if (user) req.user = user;
            } catch {
                // токен недействителен → работаем как гость
            }
        }

        next();
    } catch (error) {
        console.error('optionalAuthMiddleware error:', error);
        next();
    }
}

/* ────────────────────────────────────────
   Комбинированный режим: admin или user
──────────────────────────────────────── */
export async function optionalAdminOrUserAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    try {
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
        if (!token && req.cookies?.authToken) token = String(req.cookies.authToken);

        if (token) {
            try {
                const payload = verifyJWT(token);
                const user = await usersStorage.getUserById(payload.id);

                if (user) {
                    req.user = user;
                    if (user.isAdmin) {
                        req.admin = { id: user.id, email: user.email ?? 'unknown' };
                    }
                }
            } catch {
                // invalid token → просто гость
            }
        }

        next();
    } catch (error) {
        console.error('optionalAdminOrUserAuthMiddleware error:', error);
        next();
    }
}

export const requireAuth = authMiddleware;
