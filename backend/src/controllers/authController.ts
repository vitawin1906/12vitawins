// backend/src/controllers/authController.ts
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { userService } from '../services/userService';
import { verifyTelegramAuth } from '#utils/telegram';
import {
    signAccessToken,
    signRefreshToken,
    setAuthCookies,
    clearAuthCookies,
    verifyRefreshToken,
} from '../utils/authHelpers';
import {
    serializeTelegramUser,
    serializeEmailUser,
    serializeCurrentUser,
} from '../utils/serializers';
import {
    EmailPasswordSchema,
    TelegramIdSchema,
    NonEmptyString,
} from '../validation/commonSchemas';

/* ───────────────── Validation Schemas ───────────────── */

const TelegramBotLoginSchema = z.object({
    telegramId: TelegramIdSchema,
    firstName: NonEmptyString,
    username: z.string().optional(),
    referrerCode: z.string().optional(),
});

const TelegramAuthSchema = z.object({
    id: z.string(),
    first_name: z.string(),
    username: z.string().optional(),
    photo_url: z.string().optional(),
    auth_date: z.number(),
    hash: z.string(),
});

const ApplyReferralSchema = z.object({
    referralCode: NonEmptyString,
});

const RegisterEmailSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: NonEmptyString,
    phone: z.string().optional(),
    referralCode: z.string().optional(),
});

const RefreshTokenSchema = z.object({
    refreshToken: NonEmptyString,
});

const LinkTelegramSchema = z.object({
    telegramId: NonEmptyString,
    firstName: NonEmptyString,
    username: z.string().optional(),
});

/* ───────────────── Auth Controller ───────────────── */

export const authController = {
    /**
     * POST /api/auth/telegram-bot-login
     * Авторизация через Telegram-бот (bot → backend)
     * ⚠️ ТОЛЬКО для обычных пользователей (isAdmin=false)
     */
    telegramBotLogin: [
        asyncHandler(async (req: Request, res: Response) => {
            const body = TelegramBotLoginSchema.parse(req.body);

            // Создать/получить пользователя через userService
            const user = await userService.createUser({
                telegramId: body.telegramId,
                firstName: body.firstName,
                username: body.username ?? null,
                referrerCode: body.referrerCode ?? null,
            });

            // ✅ Проверка: админы не могут логиниться через Telegram
            if (user.isAdmin) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'Admin users must login through /api/admin/login',
                    403
                );
            }

            // Проверка активности
            if (!user.isActive) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'User account is inactive',
                    403
                );
            }

            // Обновить lastLogin
            await userService.updateLastLogin(user.id);

            // Генерация JWT
            const token = signAccessToken({
                id: user.id,
                telegramId: user.telegramId,
                isAdmin: user.isAdmin,
            });

            return res.json({
                success: true,
                authToken: token,
                user: serializeTelegramUser(user),
            });
        }),
    ],

    /**
     * POST /api/auth/telegram-auth
     * Telegram WebApp / Widget login (официальная авторизация Telegram)
     * ⚠️ ТОЛЬКО для обычных пользователей (isAdmin=false)
     */
    telegramAuth: [
        asyncHandler(async (req: Request, res: Response) => {
            const telegramData = TelegramAuthSchema.parse(req.body);

            // Верификация подписи Telegram
            const valid = await verifyTelegramAuth({
                ...telegramData,
                username: telegramData.username ?? 'User',
                photo_url: telegramData.photo_url ?? undefined,
            });

            if (!valid) {
                throw new AppError(
                    AppErrorCode.UNAUTHORIZED,
                    'Invalid Telegram auth signature',
                    401
                );
            }

            const telegramId = String(telegramData.id);

            // Создать/получить пользователя через userService
            const user = await userService.createUser({
                telegramId,
                firstName: telegramData.first_name,
                username: telegramData.username ?? null,
            });

            // ✅ Проверка: админы не могут логиниться через Telegram
            if (user.isAdmin) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'Admin users must login through /api/admin/login',
                    403
                );
            }

            // Проверка активности
            if (!user.isActive) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'User account is inactive',
                    403
                );
            }

            // Обновить lastLogin
            await userService.updateLastLogin(user.id);

            // Генерация JWT
            const token = signAccessToken({
                id: user.id,
                telegramId: user.telegramId,
                isAdmin: user.isAdmin,
            });
            const refreshToken = signRefreshToken({ id: user.id });

            // Set cookies
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.json({
                success: true,
                token,
                user: serializeTelegramUser(user),
            });
        }),
    ],

    /**
     * GET /api/auth/me
     * Получение текущего пользователя по JWT
     */
    getCurrentUser: [
        asyncHandler(async (req: Request, res: Response) => {
            // 1) Пытаемся прочитать access token из Authorization или cookie
            let accessToken: string | undefined;
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) accessToken = authHeader.slice(7);
            if (!accessToken && req.cookies?.authToken) accessToken = String(req.cookies.authToken);

            // Helper для ответа с 401
            const respondNoToken = () => res.status(401).json({ error: 'NO_TOKEN', message: 'Please log in again.' });

            // 2) Попробуем верифицировать access token
            let userIdFromAccess: string | null = null;
            if (accessToken) {
                try {
                    const { verifyAccessToken } = await import('../utils/authHelpers');
                    const payload = verifyAccessToken(accessToken);
                    userIdFromAccess = payload.id;
                } catch {
                    // access токен отсутствует или невалиден/просрочен — попробуем refresh ниже
                    userIdFromAccess = null;
                }
            }

            // 3) Если access валиден — возвращаем пользователя
            if (userIdFromAccess) {
                const user = await userService.getUserById(userIdFromAccess);
                if (!user || !user.isActive) return respondNoToken();
                return res.json({ success: true, user: serializeCurrentUser(user) });
            }

            // 4) Мягкий refresh по refreshToken (только для /auth/me)
            const refreshToken = req.cookies?.refreshToken ? String(req.cookies.refreshToken) : undefined;
            if (!refreshToken) return respondNoToken();

            try {
                const payload = verifyRefreshToken(refreshToken);
                const user = await userService.getUserById(payload.id);
                if (!user || !user.isActive) return respondNoToken();

                // Выпускаем новый access token (refresh оставляем как есть)
                const newAccess = signAccessToken({ id: user.id, telegramId: user.telegramId, isAdmin: user.isAdmin });

                // Ставим только authToken cookie (не трогаем refreshToken)
                res.cookie('authToken', newAccess, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000, // 1 день
                    path: '/',
                });

                return res.json({ success: true, user: serializeCurrentUser(user) });
            } catch {
                return respondNoToken();
            }
        }),
    ],

    /**
     * POST /api/auth/logout
     * Выход (client-side просто удаляет cookie)
     */
    logout: [
        asyncHandler(async (_req: Request, res: Response) => {
            clearAuthCookies(res);
            return res.json({
                success: true,
                message: 'Logged out successfully',
            });
        }),
    ],

    /**
     * POST /api/auth/register
     * Регистрация клиента по email + password
     * ⚠️ ТОЛЬКО для обычных пользователей (isAdmin=false)
     * Админы регистрируются отдельно через /api/admin/login
     */
    register: [
        asyncHandler(async (req: Request, res: Response) => {
            const body = RegisterEmailSchema.parse(req.body);

            // Проверка: email уже существует
            const existingUser = await userService.getUserByEmail(body.email);
            if (existingUser) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Email already registered',
                    400
                );
            }

            // Генерация временного telegramId для email-пользователей
            const tempTelegramId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Создание пользователя (isAdmin=false по умолчанию в userService.createUser)
            const user = await userService.createUser({
                telegramId: tempTelegramId,
                email: body.email,
                password: body.password,
                firstName: body.firstName,
                phone: body.phone ?? null,
                referrerCode: body.referralCode ?? null,
            });

            // ✅ Дополнительная проверка: если случайно создался админ - блокируем
            if (user.isAdmin) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'Admin users cannot register through this endpoint. Use /api/admin/login',
                    403
                );
            }

            // Генерация токенов
            const accessToken = signAccessToken({
                id: user.id,
                telegramId: user.telegramId,
                isAdmin: user.isAdmin,
            });
            const refreshToken = signRefreshToken({ id: user.id });

            // TODO: Отправка email верификации (закомментировано)
            // await sendVerificationEmail(user.email, user.id);

            // ✅ Устанавливаем cookies для автоматической авторизации
            setAuthCookies(res, accessToken, refreshToken, 1);

            return res.json({
                success: true,
                message: 'Registration successful',
                accessToken,
                refreshToken,
                user: serializeEmailUser(user),
            });
        }),
    ],

    /**
     * POST /api/auth/login
     * Вход клиента по email + password
     * ⚠️ ТОЛЬКО для обычных пользователей (isAdmin=false)
     * Админы логинятся через /api/admin/login
     */
    login: [
        asyncHandler(async (req: Request, res: Response) => {
            const body = EmailPasswordSchema.parse(req.body);

            // Поиск пользователя
            const user = await userService.getUserByEmail(body.email);
            if (!user) {
                throw new AppError(
                    AppErrorCode.UNAUTHORIZED,
                    'Invalid email or password',
                    401
                );
            }

            // ✅ Проверка: админы не могут логиниться через /api/auth/login
            if (user.isAdmin) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'Admin users must login through /api/admin/login',
                    403
                );
            }

            // Проверка пароля
            const isPasswordValid = await userService.verifyPassword(user.id, body.password);
            if (!isPasswordValid) {
                throw new AppError(
                    AppErrorCode.UNAUTHORIZED,
                    'Invalid email or password',
                    401
                );
            }

            // Проверка активности
            if (!user.isActive) {
                throw new AppError(
                    AppErrorCode.FORBIDDEN,
                    'User account is inactive',
                    403
                );
            }

            // Обновить lastLogin
            await userService.updateLastLogin(user.id);

            // Генерация токенов
            const accessToken = signAccessToken({
                id: user.id,
                telegramId: user.telegramId,
                isAdmin: user.isAdmin,
            });
            const refreshToken = signRefreshToken({ id: user.id });

            // ✅ Устанавливаем cookies для автоматической авторизации
            setAuthCookies(res, accessToken, refreshToken, 1);

            return res.json({
                success: true,
                accessToken,
                refreshToken,
                user: serializeEmailUser(user),
            });
        }),
    ],

    /**
     * POST /api/auth/refresh
     * Обновление access token через refresh token
     */
    refreshToken: [
        asyncHandler(async (req: Request, res: Response) => {
            const { refreshToken } = RefreshTokenSchema.parse(req.body);

            try {
                const payload = verifyRefreshToken(refreshToken);

                const user = await userService.getUserById(payload.id);
                if (!user) {
                    throw new AppError(
                        AppErrorCode.UNAUTHORIZED,
                        'User not found',
                        401
                    );
                }

                if (!user.isActive) {
                    throw new AppError(
                        AppErrorCode.FORBIDDEN,
                        'User account is inactive',
                        403
                    );
                }

                // Генерация новых токенов
                const accessToken = signAccessToken({
                    id: user.id,
                    telegramId: user.telegramId,
                    isAdmin: user.isAdmin,
                });
                const newRefreshToken = signRefreshToken({ id: user.id });

                return res.json({
                    success: true,
                    accessToken,
                    refreshToken: newRefreshToken,
                });
            } catch (error) {
                throw new AppError(
                    AppErrorCode.UNAUTHORIZED,
                    'Invalid or expired refresh token',
                    401
                );
            }
        }),
    ],

    /**
     * POST /api/auth/link-telegram
     * Связывание Telegram аккаунта с существующим email аккаунтом
     */
    linkTelegram: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const body = LinkTelegramSchema.parse(req.body);
            const userId = req.user!.id;

            const currentUser = await userService.getUserById(userId);
            if (!currentUser) {
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'User not found',
                    404
                );
            }

            // Проверка: уже есть Telegram
            if (currentUser.telegramId && !currentUser.telegramId.startsWith('email_')) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Telegram already linked',
                    400
                );
            }

            // Проверка: telegramId не занят другим пользователем
            const existingTelegramUser = await userService.getUserByTelegram(body.telegramId);
            if (existingTelegramUser && existingTelegramUser.id !== userId) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Telegram account already linked to another user',
                    400
                );
            }

            // Обновление пользователя
            await userService.updateUser(userId, {
                username: body.username ?? currentUser.username,
                firstName: body.firstName,
            });

            // Обновление telegramId через storage
            const usersStorage = await import('#storage/usersStorage');
            await usersStorage.usersStorage.updateUser(userId, {
                telegramId: body.telegramId,
            });

            const updatedUser = await userService.getUserById(userId);

            return res.json({
                success: true,
                message: 'Telegram successfully linked',
                user: {
                    id: updatedUser!.id,
                    email: updatedUser!.email,
                    telegramId: updatedUser!.telegramId,
                    username: updatedUser!.username,
                    firstName: updatedUser!.firstName,
                },
            });
        }),
    ],
};
