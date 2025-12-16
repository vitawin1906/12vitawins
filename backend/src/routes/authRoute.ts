// backend/src/routes/auth.routes.ts
import { Router, type RequestHandler } from 'express';
import { authController } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

const asHandlers = (h: RequestHandler | RequestHandler[]): RequestHandler[] =>
    Array.isArray(h) ? h : [h];

// Email регистрация и логин
authRouter.post('/register', authLimiter, ...asHandlers(authController.register));
authRouter.post('/login', authLimiter, ...asHandlers(authController.login));

// Refresh token
authRouter.post('/refresh', ...asHandlers(authController.refreshToken));

// Telegram авторизация
authRouter.post('/telegram-bot-login', authLimiter, ...asHandlers(authController.telegramBotLogin));
authRouter.post('/telegram-auth', authLimiter, ...asHandlers(authController.telegramAuth));

// Связывание Telegram с email аккаунтом (требует JWT)
authRouter.post('/link-telegram', ...asHandlers(authController.linkTelegram));

// Текущий пользователь (JWT)
authRouter.get('/me', ...asHandlers(authController.getCurrentUser));

// Logout
authRouter.post('/logout', ...asHandlers(authController.logout));

export default authRouter;
