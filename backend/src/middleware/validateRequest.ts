// backend/src/middleware/validateRequest.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}
