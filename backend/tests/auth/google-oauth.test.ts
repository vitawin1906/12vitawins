// backend/tests/auth/google-oauth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { googleOAuthService } from '../../src/services/googleOAuthService';
import { db } from '../../src/db';
import { appUser } from '../../src/db/schema/users';
import { eq } from 'drizzle-orm';
import * as googleOAuth from '../../src/integrations/googleOAuth';
import type { GoogleUserProfile } from '../../src/integrations/googleOAuth';

// Mock Google OAuth integration
vi.mock('../../src/integrations/googleOAuth', () => ({
    verifyIdToken: vi.fn(),
    getUserProfile: vi.fn(),
    getAuthorizationUrl: vi.fn(),
    exchangeCodeForTokens: vi.fn(),
    revokeAccess: vi.fn(),
}));

// Mock Creator Pool Service
vi.mock('../../src/services/сreatorPoolService', () => ({
    creatorPoolService: {
        getNextProPartner: vi.fn().mockResolvedValue('creator-pool-uuid'),
    },
}));

const mockGoogleProfile: GoogleUserProfile = {
    id: 'google-123456',
    email: 'test@gmail.com',
    emailVerified: true,
    name: 'Test User',
    givenName: 'Test',
    familyName: 'User',
    picture: 'https://example.com/avatar.jpg',
    locale: 'en',
};

describe('Google OAuth Service', () => {
    beforeEach(async () => {
        // Очищаем пользователей перед каждым тестом
        await db.delete(appUser);
        vi.clearAllMocks();
    });

    describe('loginWithGoogle - ID Token Flow', () => {
        it('should register new user with Google profile', async () => {
            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token');

            expect(result.isNewUser).toBe(true);
            expect(result.user.googleId).toBe('google-123456');
            expect(result.user.email).toBe('test@gmail.com');
            expect(result.user.name).toBe('Test User');
            expect(result.token).toBeDefined();
        });

        it('should login existing user by googleId', async () => {
            // Создаём пользователя
            const [existingUser] = await db.insert(appUser).values({
                googleId: 'google-123456',
                email: 'test@gmail.com',
                name: 'Test User',
                username: 'testuser',
                referralCode: 'TESTCODE',
            }).returning();

            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token');

            expect(result.isNewUser).toBe(false);
            expect(result.user.id).toBe(existingUser.id);
            expect(result.token).toBeDefined();
        });

        it('should link Google account to existing user by email', async () => {
            // Создаём пользователя без googleId (зарегистрирован через Telegram)
            const [existingUser] = await db.insert(appUser).values({
                telegramId: '123456789',
                email: 'test@gmail.com',
                name: 'Test User',
                username: 'testuser',
                referralCode: 'TESTCODE',
            }).returning();

            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token');

            expect(result.isNewUser).toBe(false);
            expect(result.user.id).toBe(existingUser.id);
            expect(result.user.googleId).toBe('google-123456');
            expect(result.token).toBeDefined();

            // Проверяем, что googleId был добавлен в БД
            const updatedUser = await db.query.appUser.findFirst({
                where: eq(appUser.id, existingUser.id),
            });

            expect(updatedUser?.googleId).toBe('google-123456');
        });

        it('should assign referrer from referral code', async () => {
            // Создаём реферера
            const [referrer] = await db.insert(appUser).values({
                telegramId: '987654321',
                email: 'referrer@gmail.com',
                name: 'Referrer',
                username: 'referrer',
                referralCode: 'REFERCODE',
            }).returning();

            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token', 'REFERCODE');

            expect(result.isNewUser).toBe(true);
            expect(result.user.referrerId).toBe(referrer.id);
        });

        it('should assign from creator pool if no referral code', async () => {
            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token');

            expect(result.isNewUser).toBe(true);
            expect(result.user.referrerId).toBe('creator-pool-uuid');
        });
    });

    describe('loginWithGoogleProfile - Callback Flow', () => {
        it('should register new user with Google profile from callback', async () => {
            const result = await googleOAuthService.loginWithGoogleProfile(mockGoogleProfile);

            expect(result.isNewUser).toBe(true);
            expect(result.user.googleId).toBe('google-123456');
            expect(result.user.email).toBe('test@gmail.com');
            expect(result.token).toBeDefined();
        });

        it('should login existing user from callback', async () => {
            const [existingUser] = await db.insert(appUser).values({
                googleId: 'google-123456',
                email: 'test@gmail.com',
                name: 'Test User',
                username: 'testuser',
                referralCode: 'TESTCODE',
            }).returning();

            const result = await googleOAuthService.loginWithGoogleProfile(mockGoogleProfile);

            expect(result.isNewUser).toBe(false);
            expect(result.user.id).toBe(existingUser.id);
        });
    });

    describe('linkGoogleAccount', () => {
        it('should link Google account to existing user', async () => {
            const [user] = await db.insert(appUser).values({
                telegramId: '123456789',
                email: 'user@example.com',
                name: 'User',
                username: 'user123',
                referralCode: 'USERCODE',
            }).returning();

            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            await googleOAuthService.linkGoogleAccount(user.id, 'fake-id-token');

            const updatedUser = await db.query.appUser.findFirst({
                where: eq(appUser.id, user.id),
            });

            expect(updatedUser?.googleId).toBe('google-123456');
            expect(updatedUser?.email).toBe('test@gmail.com');
        });

        it('should fail if Google account is already linked to another user', async () => {
            // Создаём пользователя с этим Google ID
            await db.insert(appUser).values({
                googleId: 'google-123456',
                email: 'another@example.com',
                name: 'Another User',
                username: 'another',
                referralCode: 'ANOTHER',
            });

            // Создаём текущего пользователя
            const [currentUser] = await db.insert(appUser).values({
                telegramId: '123456789',
                email: 'current@example.com',
                name: 'Current',
                username: 'current',
                referralCode: 'CURRENT',
            }).returning();

            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            await expect(
                googleOAuthService.linkGoogleAccount(currentUser.id, 'fake-id-token')
            ).rejects.toThrow('This Google account is already linked to another user');
        });
    });

    describe('unlinkGoogleAccount', () => {
        it('should unlink Google account if user has Telegram', async () => {
            const [user] = await db.insert(appUser).values({
                telegramId: '123456789',
                googleId: 'google-123456',
                email: 'test@gmail.com',
                name: 'Test User',
                username: 'testuser',
                referralCode: 'TESTCODE',
            }).returning();

            await googleOAuthService.unlinkGoogleAccount(user.id);

            const updatedUser = await db.query.appUser.findFirst({
                where: eq(appUser.id, user.id),
            });

            expect(updatedUser?.googleId).toBeNull();
        });

        it('should fail to unlink if no alternative login method', async () => {
            const [user] = await db.insert(appUser).values({
                googleId: 'google-123456',
                email: 'test@gmail.com',
                name: 'Test User',
                username: 'testuser',
                referralCode: 'TESTCODE',
            }).returning();

            await expect(
                googleOAuthService.unlinkGoogleAccount(user.id)
            ).rejects.toThrow('Cannot unlink Google account: no alternative login method');
        });
    });

    describe('Username generation', () => {
        it('should generate unique username from email', async () => {
            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token');

            expect(result.user.username).toMatch(/^test/);
        });

        it('should append number if username exists', async () => {
            // Создаём пользователя с username "test"
            await db.insert(appUser).values({
                telegramId: '123456789',
                email: 'existing@example.com',
                name: 'Existing',
                username: 'test',
                referralCode: 'EXISTING',
            });

            vi.mocked(googleOAuth.verifyIdToken).mockResolvedValue(mockGoogleProfile);

            const result = await googleOAuthService.loginWithGoogle('fake-id-token');

            expect(result.user.username).toMatch(/^test\d+$/);
        });
    });
});
