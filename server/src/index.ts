import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env';
import { connectMongo } from './config/mongo';
import { errorHandler } from './middleware/error';
import { globalLimiter } from './middleware/rateLimiter';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';

async function main() {
  await connectMongo();

  const app = express();
  app.set('trust proxy', 1);

  app.use(globalLimiter);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: env.cookieName,
      cookie: {
        httpOnly: true,
        secure: env.secureCookies,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
      store: MongoStore.create({
        mongoUrl: env.mongoUri,
        ttl: 7 * 24 * 60 * 60,
      }),
    })
  );

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
