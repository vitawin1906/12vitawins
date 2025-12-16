// backend/src/controllers/adminAuthController.ts
import type { Request, Response } from 'express';
// @ts-ignore: types provided via @types/bcrypt in dev or local shim
import bcrypt from 'bcrypt';
import { usersStorage } from '#storage/usersStorage';
import { EmailPasswordSchema } from '../validation/commonSchemas';
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/authHelpers';
import { serializeEmailUser } from '../utils/serializers';

export const adminAuthController = {
  login: async (req: Request, res: Response) => {
    const body = EmailPasswordSchema.parse(req.body);
    const user = await usersStorage.getUserByEmail(body.email);
    if (!user || !user.isAdmin || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
    }

    // ✅ Генерируем JWT токены через shared utilities
      const accessToken = signAccessToken(
          {
              id: user.id,
              isAdmin: user.isAdmin,
              telegramId: user.telegramId || null,
          },
          '7d'
      );

      const refreshToken = signRefreshToken({ id: user.id });

    // ✅ Устанавливаем cookies через shared helper
    setAuthCookies(res, accessToken, refreshToken, 7); // 7 days for admin

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: serializeEmailUser(user),
    });
  },

  logout: async (_req: Request, res: Response) => {
    clearAuthCookies(res);
    return res.json({ success: true });
  },

  me: async (req: Request, res: Response) => {
    // ✅ Используем req.user (устанавливается authMiddleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found in request' });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Admin access required' });
    }
    return res.json({ success: true, user });
  },

};
