// backend/src/integrations/googleOAuth.ts
import { google } from 'googleapis';
import { googleOAuthConfig } from '../config/googleOAuth';

/**
 * Google OAuth 2.0 Integration
 * Использует официальную библиотеку googleapis
 */

export interface GoogleUserProfile {
    id: string; // Google User ID
    email: string;
    emailVerified: boolean;
    name: string;
    givenName: string;
    familyName: string;
    picture: string;
    locale: string;
}

/**
 * Создать OAuth2 клиент
 */
export function createOAuth2Client() {
    const { clientId, clientSecret, redirectUri } = googleOAuthConfig;

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Получить URL для авторизации через Google
 */
export function getAuthorizationUrl(state?: string): string {
    const oauth2Client = createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: googleOAuthConfig.scopes,
        state: state || '', // CSRF protection
        prompt: 'consent', // Принудительно показывать экран согласия
    });

    return authUrl;
}

/**
 * Обменять authorization code на токены
 */
export async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
}> {
    const oauth2Client = createOAuth2Client();

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
        throw new Error('Failed to get access token from Google');
    }

    const result: { accessToken: string; refreshToken?: string; expiryDate?: number } = {
        accessToken: tokens.access_token,
    };
    if (tokens.refresh_token) result.refreshToken = tokens.refresh_token;
    if (typeof tokens.expiry_date === 'number') result.expiryDate = tokens.expiry_date;
    return result;
}

/**
 * Получить профиль пользователя по access token
 */
export async function getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    const { data } = await oauth2.userinfo.get();

    if (!data.id || !data.email) {
        throw new Error('Failed to get user profile from Google');
    }

    return {
        id: data.id,
        email: data.email,
        emailVerified: data.verified_email ?? false,
        name: data.name ?? '',
        givenName: data.given_name ?? '',
        familyName: data.family_name ?? '',
        picture: data.picture ?? '',
        locale: data.locale ?? '',
    };
}

/**
 * Верифицировать Google ID Token (альтернативный метод)
 * Используется когда фронтенд отправляет id_token напрямую
 */
export async function verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    const oauth2Client = createOAuth2Client();

    const ticket = await oauth2Client.verifyIdToken({
        idToken,
        audience: googleOAuthConfig.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
        throw new Error('Invalid Google ID token');
    }

    return {
        id: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified ?? false,
        name: payload.name ?? '',
        givenName: payload.given_name ?? '',
        familyName: payload.family_name ?? '',
        picture: payload.picture ?? '',
        locale: payload.locale ?? '',
    };
}

/**
 * Отозвать доступ (logout)
 */
export async function revokeAccess(accessToken: string): Promise<void> {
    const oauth2Client = createOAuth2Client();
    await oauth2Client.revokeToken(accessToken);
}
