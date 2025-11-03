import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { me, listUsers } from '../controllers/user.controller';

export const userRouter = Router();

userRouter.get('/me', requireAuth, me);
userRouter.get('/', requireAuth, requireRole('admin'), listUsers);
