import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/satyavak',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  cookieName: process.env.COOKIE_NAME || 'satya.sid',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'satya.refresh',
  secureCookies: process.env.SECURE_COOKIES === 'true',
};
