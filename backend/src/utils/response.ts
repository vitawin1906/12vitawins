export const ok = <T>(data: T) => ({ data });
export const fail = (code: string, message: string, details?: unknown) => ({ error: { code, message, details } });

// Async wrapper to unify error handling in route handlers
export function wrap<T extends (...args: any[]) => Promise<any>>(handler: T) {
  return async (req: any, res: any, next: any) => {
    try {
      await handler(req, res, next);
    } catch (err: any) {
      const status = err?.statusCode || err?.status || 500;
      const code = err?.code || 'INTERNAL_ERROR';
      const message = err?.message || 'Internal Server Error';
      const details = err?.details;
      res.status(status).json(fail(code, message, details));
    }
  };
}



