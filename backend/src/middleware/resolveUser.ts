import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import {db} from "../db/db";
import {appUser} from "../db/schema";

// Simple in-memory cache: telegramId -> uid
const cache = new Map<number, string>();

declare module 'express-serve-static-core' {
  interface Request {
    context?: { userUid?: string };
  }
}

export async function resolveUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers['x-telegram-id'] || req.headers['x-telegram-user-id'];
    const val = Array.isArray(header) ? header[0] : header;
    const str = typeof val === 'string' ? val : undefined;

    if (!str || !/^\d+$/.test(str)) {
      return next();
    }

    const tgId = Number(str);
    const cached = cache.get(tgId);
    if (cached) {
      req.context = { ...(req.context ?? {}), userUid: cached };
      return next();
    }

      const row = (
          await db
              .select({ uid: appUser.id })
              .from(appUser)
              .where(eq(appUser.telegramId, tgId.toString()))   // ← фикс
              .limit(1)
      )[0];
    if (row?.uid) {
      cache.set(tgId, row.uid);
      req.context = { ...(req.context ?? {}), userUid: row.uid };
    }
  } catch {
    // swallow errors; do not block request flow
  } finally {
    next();
  }
}
