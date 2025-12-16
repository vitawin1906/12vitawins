// backend/src/config/googleOAuth.ts
import 'dotenv/config';

/**
 * Google OAuth 2.0 Configuration
 *
 * Получить credentials:
 * 1. Google Cloud Console: https://console.cloud.google.com/
 * 2. APIs & Services → Credentials
 * 3. Create OAuth 2.0 Client ID (Web application)
 * 4. Authorized redirect URIs: http://localhost:3001/api/auth/google/callback
 */

export interface GoogleOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
}

export const googleOAuthConfig: GoogleOAuthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback',
    scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
};

/**
 * Проверка конфигурации Google OAuth
 */
export function validateGoogleOAuthConfig(): void {
    if (!googleOAuthConfig.clientId) {
        console.warn('⚠️ GOOGLE_CLIENT_ID not set. Google OAuth will not work.');
    }

    if (!googleOAuthConfig.clientSecret) {
        console.warn('⚠️ GOOGLE_CLIENT_SECRET not set. Google OAuth will not work.');
    }

    if (process.env.NODE_ENV === 'production' && googleOAuthConfig.redirectUri.includes('localhost')) {
        console.warn('⚠️ GOOGLE_REDIRECT_URI points to localhost in production!');
    }
}

/**
 * Проверка, включен ли Google OAuth
 */
export function isGoogleOAuthEnabled(): boolean {
    return !!(googleOAuthConfig.clientId && googleOAuthConfig.clientSecret);
}

// Валидация при импорте (только warning, не падаем)
if (process.env.NODE_ENV !== 'test') {
    validateGoogleOAuthConfig();
}
