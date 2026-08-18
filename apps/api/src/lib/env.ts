import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret-change-in-production'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-in-production'),
  ACCESS_TOKEN_TTL: z.coerce.number().int().default(900), // 15 min
  REFRESH_TOKEN_TTL: z.coerce.number().int().default(60 * 60 * 24 * 30), // 30 days
  REDIS_URL: z.string().optional().or(z.literal('')),
  STRIPE_SECRET_KEY: z.string().optional().or(z.literal('')),
  STRIPE_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  PAYPAL_CLIENT_ID: z.string().optional().or(z.literal('')),
  PAYPAL_SECRET: z.string().optional().or(z.literal('')),
  SENTRY_DSN: z.string().optional().or(z.literal('')),

  // Mail — without SMTP_URL messages are logged and recorded, never dropped.
  SMTP_URL: z.string().optional().or(z.literal('')),
  MAIL_FROM: z.string().optional().or(z.literal('')),

  // Web Push (VAPID). Generate with: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: z.string().optional().or(z.literal('')),
  VAPID_PRIVATE_KEY: z.string().optional().or(z.literal('')),
  VAPID_SUBJECT: z.string().default('mailto:support@islamabadrestaurant.pk'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment configuration:');
  console.error(z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const dbProvider: 'postgresql' | 'sqlite' = env.DATABASE_URL.startsWith('postgres')
  ? 'postgresql'
  : 'sqlite';

if (isProd) {
  const weak = ['dev-access-secret-change-in-production', 'dev-refresh-secret-change-in-production'];
  if (weak.includes(env.JWT_ACCESS_SECRET) || weak.includes(env.JWT_REFRESH_SECRET)) {
    console.error('[env] Refusing to boot in production with default JWT secrets.');
    process.exit(1);
  }
}
