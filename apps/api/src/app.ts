import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { BRAND, DELIVERY_ZONES, OPENING_HOURS } from '@islamabad/shared';
import { env, isProd, isTest, dbProvider } from './lib/env.js';
import { cache } from './lib/cache.js';
import { prisma } from './lib/prisma.js';
import { csrfGuard, errorHandler, notFoundHandler, rateLimit, asyncHandler } from './middleware/index.js';
import { authRouter } from './routes/auth.js';
import { menuRouter } from './routes/menu.js';
import { orderRouter } from './routes/orders.js';
import { reservationRouter } from './routes/reservations.js';
import { adminRouter } from './routes/admin.js';
import { marketingRouter } from './routes/marketing.js';
import { assistantRouter } from './routes/assistant.js';
import { customerRouter } from './routes/customer.js';
import { webhookRouter } from './routes/webhooks.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  /* ------------------------------ security ------------------------------- */
  app.use(
    helmet({
      contentSecurityPolicy: false, // the Next.js app owns the browser CSP
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    }),
  );

  const allowedOrigins = new Set(
    env.WEB_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/server-side requests have no Origin header.
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        // e2b/vercel preview hosts for this project.
        if (/^https:\/\/[\w-]+\.(e2b\.app|vercel\.app)$/.test(origin)) return callback(null, true);
        if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    }),
  );

  /* ------------------------------ webhooks ------------------------------- */
  // Mounted before the JSON parser: signature verification needs the raw body.
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

  /* ------------------------------ pipeline ------------------------------- */
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));

  // Global floor limit; individual routes apply tighter budgets.
  app.use('/api', rateLimit({ windowSeconds: 60, max: 300, keyPrefix: 'global' }));
  app.use(csrfGuard);

  /* ------------------------------- health -------------------------------- */
  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      const started = Date.now();
      let database = 'up';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        database = 'down';
      }
      res.json({
        status: database === 'up' ? 'ok' : 'degraded',
        service: 'islamabad-restaurant-api',
        version: '1.0.0',
        environment: env.NODE_ENV,
        database: { status: database, provider: dbProvider },
        cache: { driver: cache.name },
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  /** Public restaurant configuration — consumed by the web app + schema.org. */
  app.get('/api/config', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json({
      brand: BRAND,
      hours: OPENING_HOURS,
      deliveryZones: DELIVERY_ZONES,
    });
  });

  /* -------------------------------- routes ------------------------------- */
  app.use('/api/auth', authRouter);
  app.use('/api/menu', menuRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/reservations', reservationRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/marketing', marketingRouter);
  app.use('/api/assistant', assistantRouter);
  app.use('/api/customer', customerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
