// backend/src/routes/googleOAuth.routes.ts
import { Router } from 'express';
import { googleOAuthService } from '../services/googleOAuthService';
import {
    googleLoginSchema,
    linkGoogleAccountSchema,
    googleCallbackSchema,
} from '../validation/googleOAuthSchemas';
import { requireAuth } from '../middleware/auth';
import { getAuthorizationUrl, exchangeCodeForTokens, getUserProfile } from '../integrations/googleOAuth';
import { isGoogleOAuthEnabled } from '../config/googleOAuth';
import { setAuthCookies, signAccessToken, signRefreshToken } from '../utils/authHelpers';
import crypto from 'crypto';

const router = Router();

function getFrontendOrigin(): string {
    return process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
}

function b64url(input: string | Buffer): string {
    return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signState(payload: { mode: 'login' | 'link'; ref?: string; csrf: string; iat: number }): string {
    const secret = process.env.GOOGLE_OAUTH_STATE_SECRET || '';
    const data = `${payload.mode}|${payload.ref || ''}|${payload.csrf}|${payload.iat}`;
    const sig = secret ? crypto.createHmac('sha256', secret).update(data).digest('hex') : '';
    const full = { ...payload, sig } as const;
    return b64url(JSON.stringify(full));
}

function verifyState(raw: string): { mode: 'login' | 'link'; ref?: string } | null {
    try {
        const json = JSON.parse(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as {
            mode: 'login' | 'link'; ref?: string; csrf: string; iat: number; sig?: string;
        };
        const secret = process.env.GOOGLE_OAUTH_STATE_SECRET || '';
        if (secret) {
            const data = `${json.mode}|${json.ref || ''}|${json.csrf}|${json.iat}`;
            const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
            if (json.sig !== expected) return null;
        }
        // TTL 10 минут
        const now = Math.floor(Date.now() / 1000);
        if (now - json.iat > 600) return null;
        return json.ref !== undefined ? { mode: json.mode, ref: json.ref } : { mode: json.mode };
    } catch {
        return null;
    }
}

/**
 * GET /api/auth/google
 * Получить URL для редиректа на Google OAuth (JSON)
 */
router.get('/google', (req, res) => {
    if (!isGoogleOAuthEnabled()) {
        return res.status(503).json({
            success: false,
            message: 'Google OAuth is not configured',
        });
    }

    try {
        const refParam = req.query.ref as string | undefined;
        const csrf = crypto.randomBytes(16).toString('hex');
        const statePayload = refParam
            ? { mode: 'login' as const, ref: refParam, csrf, iat: Math.floor(Date.now() / 1000) }
            : { mode: 'login' as const, csrf, iat: Math.floor(Date.now() / 1000) };
        const state = signState(statePayload);
        const authUrl = getAuthorizationUrl(state);

        res.json({
            success: true,
            data: { authUrl },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate authorization URL',
        });
    }
});

/**
 * GET /api/auth/google/init
 * Немедленный редирект 302 на Google OAuth
 */
router.get('/google/init', (req, res) => {
    if (!isGoogleOAuthEnabled()) {
        return res.status(503).json({ success: false, message: 'Google OAuth is not configured' });
    }
    const refParam = req.query.ref as string | undefined;
    const mode = (req.query.mode as 'login' | 'link' | undefined) || 'login';
    const csrf = crypto.randomBytes(16).toString('hex');
    const statePayload = refParam
        ? { mode, ref: refParam, csrf, iat: Math.floor(Date.now() / 1000) }
        : { mode, csrf, iat: Math.floor(Date.now() / 1000) };
    const state = signState(statePayload);
    const authUrl = getAuthorizationUrl(state);
    res.redirect(authUrl);
});

/**
 * GET /api/auth/google/callback
 * Callback от Google OAuth (Authorization Code Flow)
 */
router.get('/google/callback', async (req, res) => {
    if (!isGoogleOAuthEnabled()) {
        return res.status(503).json({
            success: false,
            message: 'Google OAuth is not configured',
        });
    }

    try {
        const validation = googleCallbackSchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({ success: false, message: 'Invalid callback parameters', errors: validation.error.issues });
        }

        const { code, state } = validation.data as { code: string; state?: string };
        const parsed = state ? verifyState(state) : null;
        if (!parsed) {
            const url = `${getFrontendOrigin()}/auth?error=oauth_state`;
            return res.redirect(url);
        }

        // Обмениваем code на токены и получаем профиль
        const { accessToken } = await exchangeCodeForTokens(code);
        const googleProfile = await getUserProfile(accessToken);

        const result = await googleOAuthService.loginWithGoogleProfile(googleProfile, parsed.ref);

        // Блокируем вход для админов через Google
        if ((result.user as any).isAdmin) {
            const url = `${getFrontendOrigin()}/auth?error=forbidden`;
            return res.redirect(url);
        }

        // Устанавливаем auth cookies и редирект на главную
        const accessJwt = signAccessToken({ id: result.user.id, isAdmin: false, telegramId: result.user.telegramId });
        const refreshJwt = signRefreshToken({ id: result.user.id });
        setAuthCookies(res, accessJwt, refreshJwt, 1);

        return res.redirect(`${getFrontendOrigin()}/`);
    } catch (error: any) {
        console.error('Google OAuth callback error:', error);
        const errorUrl = `${getFrontendOrigin()}/auth?error=${encodeURIComponent(error.message || 'google_oauth_failed')}`;
        return res.redirect(errorUrl);
    }
});

/**
 * POST /api/auth/google/id-token
 * Логин через Google (ID Token flow)
 */
router.post('/google/id-token', async (req, res) => {
    if (!isGoogleOAuthEnabled()) {
        return res.status(503).json({ success: false, message: 'Google OAuth is not configured' });
    }

    try {
        const validation = googleLoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ success: false, message: 'Invalid request body', errors: validation.error.issues });
        }

        const { idToken, refCode } = validation.data;
        const result = await googleOAuthService.loginWithGoogle(idToken, refCode);

        if ((result.user as any).isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin users must use /api/admin/login' });
        }

        const accessJwt = signAccessToken({ id: result.user.id, isAdmin: false, telegramId: result.user.telegramId });
        const refreshJwt = signRefreshToken({ id: result.user.id });
        setAuthCookies(res, accessJwt, refreshJwt, 1);

        return res.json({ success: true, user: result.user });
    } catch (error: any) {
        console.error('Google id-token login error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to login with Google' });
    }
});

/**
 * POST /api/auth/google/link
 * Привязать Google-аккаунт к текущему пользователю
 * Требует авторизации
 */
router.post('/google/link', requireAuth, async (req, res) => {
    if (!isGoogleOAuthEnabled()) {
        return res.status(503).json({
            success: false,
            message: 'Google OAuth is not configured',
        });
    }

    try {
        const validation = linkGoogleAccountSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request body',
                errors: validation.error.issues,
            });
        }

        const { idToken } = validation.data;
        const userId = req.user!.id;

        await googleOAuthService.linkGoogleAccount(userId, idToken);

        res.json({
            success: true,
            message: 'Google account linked successfully',
        });
    } catch (error: any) {
        console.error('Google link error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to link Google account',
        });
    }
});

/**
 * POST /api/auth/google/unlink
 * Отвязать Google-аккаунт от текущего пользователя
 * Требует авторизации
 */
router.post('/google/unlink', requireAuth, async (req, res) => {
    if (!isGoogleOAuthEnabled()) {
        return res.status(503).json({
            success: false,
            message: 'Google OAuth is not configured',
        });
    }

    try {
        const userId = req.user!.id;

        await googleOAuthService.unlinkGoogleAccount(userId);

        res.json({
            success: true,
            message: 'Google account unlinked successfully',
        });
    } catch (error: any) {
        console.error('Google unlink error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to unlink Google account',
        });
    }
});

export default router;
