// backend/src/services/googleOAuthService.ts
import { db } from '#db/db';
import { appUser } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { verifyIdToken, type GoogleUserProfile } from '../integrations/googleOAuth';
import { createJWT } from '../utils/authHelpers';
import { creatorPoolService } from './сreatorPoolService';
import type { AppUser } from '../db/schema/users';

export interface GoogleLoginResult {
    user: AppUser;
    token: string;
    isNewUser: boolean;
}

/**
 * Google OAuth Service
 * Обрабатывает логин, регистрацию и привязку Google-аккаунтов
 */
class GoogleOAuthService {
    /**
     * Войти через Google используя GoogleUserProfile (для callback flow)
     * @param googleProfile - Профиль Google пользователя
     * @param refCode - Реферальный код (опционально, для новых пользователей)
     */
    async loginWithGoogleProfile(googleProfile: GoogleUserProfile, refCode?: string): Promise<GoogleLoginResult> {
        return await this.processGoogleLogin(googleProfile, refCode);
    }

    /**
     * Войти через Google (или зарегистрироваться, если пользователя нет)
     * @param idToken - Google ID Token от фронтенда
     * @param refCode - Реферальный код (опционально, для новых пользователей)
     */
    async loginWithGoogle(idToken: string, refCode?: string): Promise<GoogleLoginResult> {
        // Верифицируем ID token
        const googleProfile = await verifyIdToken(idToken);
        return await this.processGoogleLogin(googleProfile, refCode);
    }

    /**
     * Основная логика логина через Google
     */
    private async processGoogleLogin(googleProfile: GoogleUserProfile, refCode?: string): Promise<GoogleLoginResult> {

        // Ищем пользователя по googleId
        const existingUserByGoogleId = await db.query.appUser.findFirst({
            where: eq(appUser.googleId, googleProfile.id),
        });

        if (existingUserByGoogleId) {
            // Пользователь уже есть — возвращаем JWT
            const token = createJWT(existingUserByGoogleId.id);
            return {
                user: existingUserByGoogleId as AppUser,
                token,
                isNewUser: false,
            };
        }

        // Ищем по email (возможно, пользователь уже регистрировался через Telegram)
        const existingUserByEmail = await db.query.appUser.findFirst({
            where: eq(appUser.email, googleProfile.email),
        });

        if (existingUserByEmail) {
            // Привязываем Google ID к существующему аккаунту
            const [updatedUser] = await db
                .update(appUser)
                .set({
                    googleId: googleProfile.id,
                    firstName: existingUserByEmail.firstName || googleProfile.givenName || existingUserByEmail.firstName,
                    lastName: existingUserByEmail.lastName || googleProfile.familyName || existingUserByEmail.lastName,
                    googleAvatar: existingUserByEmail.googleAvatar || googleProfile.picture,
                    updatedAt: new Date(),
                })
                .where(eq(appUser.id, existingUserByEmail.id))
                .returning();

            if (!updatedUser) throw new Error('Failed to update user with Google account');
            const token = createJWT(updatedUser.id);
            return {
                user: updatedUser as AppUser,
                token,
                isNewUser: false,
            };
        }

        // Новый пользователь — регистрируем
        return await this.registerWithGoogle(googleProfile, refCode);
    }

    /**
     * Зарегистрировать нового пользователя через Google
     */
    private async registerWithGoogle(
        googleProfile: GoogleUserProfile,
        refCode?: string
    ): Promise<GoogleLoginResult> {
        // Генерируем уникальный username
        const username = await this.generateUniqueUsername(googleProfile.email);

        // Определяем реферера
        let referrerId: string | null = null;

        if (refCode) {
            // Если есть refCode — ищем реферера
            const referrer = await db.query.appUser.findFirst({
                where: eq(appUser.referralCode, refCode),
            });

            if (referrer) {
                referrerId = referrer.id;
            }
        }

        // Если нет реферера — берём из Creator Pool
        if (!referrerId) {
            referrerId = await creatorPoolService.pickCreatorId();
        }

        // Создаём пользователя
        const rows = await db
            .insert(appUser)
            .values({
                googleId: googleProfile.id,
                email: googleProfile.email ?? null,
                username,
                firstName: googleProfile.givenName ?? null,
                lastName: googleProfile.familyName ?? null,
                googleAvatar: googleProfile.picture ?? null,
                referralCode: await this.generateReferralCode(),
                referrerId,
            })
            .returning();

        const newUser = (rows as any)[0] as AppUser | undefined;
        if (!newUser) throw new Error('Failed to create user via Google');
        const token = createJWT(newUser.id);

        return {
            user: newUser,
            token,
            isNewUser: true,
        };
    }

    /**
     * Привязать Google-аккаунт к существующему пользователю
     */
    async linkGoogleAccount(userId: string, idToken: string): Promise<void> {
        const googleProfile = await verifyIdToken(idToken);

        // Проверяем, что этот Google ID не используется другим пользователем
        const existingUser = await db.query.appUser.findFirst({
            where: eq(appUser.googleId, googleProfile.id),
        });

        if (existingUser && existingUser.id !== userId) {
            throw new Error('This Google account is already linked to another user');
        }

        // Привязываем Google ID
        await db
            .update(appUser)
            .set({
                googleId: googleProfile.id,
                email: googleProfile.email ?? null,
                googleAvatar: googleProfile.picture ?? null,
                updatedAt: new Date(),
            })
            .where(eq(appUser.id, userId));
    }

    /**
     * Отвязать Google-аккаунт от пользователя
     */
    async unlinkGoogleAccount(userId: string): Promise<void> {
        const user = await db.query.appUser.findFirst({
            where: eq(appUser.id, userId),
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Проверяем, что у пользователя есть другой способ входа (Telegram)
        if (!user.telegramId) {
            throw new Error('Cannot unlink Google account: no alternative login method');
        }

        await db
            .update(appUser)
            .set({
                googleId: null,
                updatedAt: new Date(),
            })
            .where(eq(appUser.id, userId));
    }

    /**
     * Генерировать уникальный username из email
     */
    private async generateUniqueUsername(email: string | null | undefined): Promise<string> {
        const base = (email ?? '').split('@')[0];
        const baseUsername = (base && base.length > 0 ? base : 'user')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        let username = baseUsername;
        let counter = 1;

        // Проверяем уникальность
        while (true) {
            const existing = await db.query.appUser.findFirst({
                where: eq(appUser.username, username),
            });

            if (!existing) {
                return username;
            }

            username = `${baseUsername}${counter}`;
            counter++;
        }
    }

    /**
     * Генерировать уникальный реферальный код
     */
    private async generateReferralCode(): Promise<string> {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = 8;

        while (true) {
            let code = '';
            for (let i = 0; i < length; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const existing = await db.query.appUser.findFirst({
                where: eq(appUser.referralCode, code),
            });

            if (!existing) {
                return code;
            }
        }
    }
}

export const googleOAuthService = new GoogleOAuthService();
