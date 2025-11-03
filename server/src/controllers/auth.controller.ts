import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt';
import { env } from '../config/env';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const common = {
    httpOnly: true as const,
    secure: env.secureCookies,
    sameSite: 'lax' as const,
  };
  res.cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie(env.refreshCookieName, refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req: Request, res: Response) {
  try {
    const { email, name, password } = req.body as { email: string; name: string; password: string };
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, name, passwordHash, role: 'user' });
    console.log('User registered successfully:', user.email, user.id);
    const access = signAccessToken({ sub: user.id, role: user.role });
    const refresh = signRefreshToken({ sub: user.id, role: user.role });
    setAuthCookies(res, access, refresh);
    return res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    return res.status(500).json({ error: 'Failed to create account' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const access = signAccessToken({ sub: user.id, role: user.role });
  const refresh = signRefreshToken({ sub: user.id, role: user.role });
  setAuthCookies(res, access, refresh);
  return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[env.refreshCookieName] as string | undefined;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = verifyToken<{ sub: string; role: string }>(token);
    const access = signAccessToken({ sub: payload.sub, role: payload.role });
    const refreshToken = signRefreshToken({ sub: payload.sub, role: payload.role });
    setAuthCookies(res, access, refreshToken);
    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie(env.refreshCookieName);
  return res.json({ ok: true });
}
