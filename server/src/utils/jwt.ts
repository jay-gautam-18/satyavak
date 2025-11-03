import { sign, verify, JwtPayload, Secret } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayloadBase extends JwtPayload {
  sub: string;
  role: string;
}

export function signAccessToken(payload: JwtPayloadBase): string {
  return (sign as unknown as (p: object, s: Secret, o: { expiresIn: string }) => string)(
    payload,
    env.jwtSecret as Secret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function signRefreshToken(payload: JwtPayloadBase): string {
  return (sign as unknown as (p: object, s: Secret, o: { expiresIn: string }) => string)(
    payload,
    env.jwtSecret as Secret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
}

export function verifyToken<T = JwtPayloadBase>(token: string): T {
  return verify(token, env.jwtSecret as Secret) as T;
}
