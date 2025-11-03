import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = await User.findById(req.user.id).select('email name role createdAt');
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json(user);
}

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await User.find().select('email name role createdAt');
  return res.json(users);
}
