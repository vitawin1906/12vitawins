import type { RequestHandler } from 'express';
export const ah = (fn: RequestHandler): RequestHandler =>
    (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);