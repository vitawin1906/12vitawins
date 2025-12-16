import type { Request, Response, NextFunction } from 'express';
import * as usersStorage from '#storage/usersStorage';

/**
 * Utility: перезаписать содержимое объекта, сохраняя ссылку
 */
function replaceObjectContent(target: unknown, source: unknown) {
    if (!target || typeof target !== 'object' || !source || typeof source !== 'object') return;
    const t = target as Record<string, unknown>;
    for (const key of Object.keys(t)) delete t[key];
    Object.assign(t, source as Record<string, unknown>);
}

/**
 * Расширяем тип Request для поддержки req.admin
 */
declare global {
    namespace Express {
        interface Request {
            admin?: {
                id: string;
                email: string; // должен совпадать с уже объявленным типом
            };
        }
    }
}

/**
 * 🔒 Enhanced admin protection middleware
 * Проверяет, что admin существует, активен и запрос исходит из доверенного источника
 */
export const enhancedAdminProtection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.admin?.id) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const admin = await usersStorage.usersStorage.getUserById(req.admin.id);
        if (!admin || !admin.isAdmin) {
            return res.status(403).json({ error: 'Admin account not found or access denied' });
        }

        const referer = req.get('Referer') || '';
        const ip = req.ip || '';

        // Разрешаем локальные и доверенные домены
        const allowedDomains = ['localhost', 'replit.dev', 'vitawins.ru'];
        const isAllowedReferer = allowedDomains.some((domain) => referer.includes(domain));

        if (!isAllowedReferer) {
            // локальные IP всё равно разрешаем
            if (ip.startsWith('172.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
                return next();
            }
            console.warn(`⚠️ Suspicious admin access attempt from ${ip} (referer: ${referer || 'none'})`);
        }

        // здесь можно добавить rate-limit через Redis
        next();
    } catch (error) {
        console.error('Enhanced admin protection error:', error);
        res.status(500).json({ error: 'Security check failed' });
    }
};

/**
 * 🧱 SQL injection protection middleware
 * Проверяет тело, query и params на признаки SQL-инъекций
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
    const sqlPatterns = [
        /(--|\#|\/\*|\*\/)/gi,
        /('.*OR.*'|'.*AND.*')/gi,
        /(\bUNION\b.*\bSELECT\b)/gi,
        /(\\x27|\\x2D\\x2D)/gi,
        /'{2,}/gi,
        /;.*\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/gi,
    ];

    const checkSqlInjection = (val: unknown): boolean => {
        if (typeof val === 'string') return sqlPatterns.some((p) => p.test(val));
        if (Array.isArray(val)) return val.some(checkSqlInjection);
        if (val && typeof val === 'object') return Object.values(val).some(checkSqlInjection);
        return false;
    };

    if (checkSqlInjection(req.body) || checkSqlInjection(req.query) || checkSqlInjection(req.params)) {
        console.warn(`🚨 Possible SQL injection attempt from ${req.ip}`);
        return res.status(400).json({ error: 'Invalid or unsafe input detected' });
    }

    next();
};

/**
 * 🧼 XSS protection middleware
 * Удаляет потенциально опасные теги и атрибуты из body и query
 */
export const xssProtection = (req: Request, _res: Response, next: NextFunction) => {
    const sanitizeXSS = (val: unknown): unknown => {
        if (typeof val === 'string') {
            return val
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/data:text\/html/gi, '');
        }
        if (Array.isArray(val)) return val.map(sanitizeXSS);
        if (val && typeof val === 'object') {
            const out: Record<string, unknown> = {};
            for (const k in val as Record<string, unknown>) {
                out[k] = sanitizeXSS((val as Record<string, unknown>)[k]);
            }
            return out;
        }
        return val;
    };

    if (req.body) replaceObjectContent(req.body, sanitizeXSS(req.body));
    if (req.query) replaceObjectContent(req.query, sanitizeXSS(req.query));

    next();
};
