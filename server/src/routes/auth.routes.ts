import { Router, Request, Response, NextFunction } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimiter';
import { loginSchema, registerSchema } from '../validators/auth.schema';
import { z } from 'zod';

function validate(schema: z.ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), register);
authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
