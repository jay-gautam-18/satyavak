import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'ValidationError', details: err.flatten() });
  }
  if (err && typeof err === 'object' && 'status' in err) {
    const e = err as { status: number; message?: string };
    return res.status(e.status || 500).json({ error: e.message || 'ServerError' });
  }
  console.error(err);
  return res.status(500).json({ error: 'ServerError' });
}
