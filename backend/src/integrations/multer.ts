// backend/src/middleware/upload-mw.ts — legacy stub (server-side file handling removed)
// Export a minimal no-op middleware compatible with previous API without any third-party libs.
import type { RequestHandler } from 'express';

function noop(): RequestHandler {
    return (_req, _res, next) => next();
}

export const upload = {
    single: (_field: string) => noop(),
    array: (_field: string, _max?: number) => noop(),
    fields: (_defs: Array<{ name: string; maxCount?: number }>) => noop(),
} as const;
