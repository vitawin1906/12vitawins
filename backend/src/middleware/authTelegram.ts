// src/middlewares/authTelegram.ts
import type { Request, Response, NextFunction } from 'express';

// Minimal TG auth stub: read x-telegram-id header or query param tg_id
// In production, verify Telegram Login Widget signature.
export interface TgAuthRequest extends Request {
  tgUserId?: number;
}

export function authTelegramOptional(req: TgAuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers['x-telegram-id'] || req.headers['x-telegram-user-id'];
  const fromQuery = (req.query['tg_id'] as string | undefined) ?? (req.query['telegramId'] as string | undefined);
  const val = (Array.isArray(header) ? header[0] : header) ?? fromQuery;
  if (typeof val === 'string' && /^\d+$/.test(val)) {
    req.tgUserId = Number(val);
  }
  next();
}

export function requireTelegramAuth(req: TgAuthRequest, res: Response, next: NextFunction) {
  if (!req.tgUserId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Telegram auth required' } });
  }
  next();
}
