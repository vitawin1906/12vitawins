// src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import errorMonitoringService from '../services/errorMonitoringService';

export enum AppErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
    constructor(
        public code: AppErrorCode,
        public override message: string,
        public statusCode: number = 400,
        public details?: any,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    try {
        errorMonitoringService.logError({
            level: 'error',
            message: err.message,
            stack: (err as any).stack,
            code: (err as any).code ?? 'UNKNOWN',
            context: {
                method: req.method,
                url: req.url,
                body: req.body,
                userId: (req as any).user?.id,
            },
        });
    } catch {
        /* swallow logging errors */
    }

    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: 'Validation failed',
            details: err.message,
            formatted: err.format(),
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            details: err.details,
        });
    }

    const pgCode = (err as any)?.code;
    if (pgCode === '23505') {
        return res.status(409).json({
            error: 'Duplicate entry',
            code: AppErrorCode.DUPLICATE_ENTRY,
            message: 'Record already exists',
        });
    }
    if (pgCode === '23503') {
        return res.status(400).json({
            error: 'Invalid reference',
            code: AppErrorCode.VALIDATION_ERROR,
            message: 'Referenced record does not exist',
        });
    }

    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
        error: 'Internal Server Error',
        code: AppErrorCode.INTERNAL_ERROR,
        message: isProd ? 'Something went wrong' : err.message,
        ...(isProd ? {} : { stack: err.stack }),
    });
}

export function asyncHandler<
    H extends (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>
>(fn: H) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
