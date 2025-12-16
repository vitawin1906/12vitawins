import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Print all validation issues for quick setup
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten());
  process.exit(1);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3001),

  // обязательно переопредели в .env!
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev_only_change_me',

  // куки
  COOKIE_NAME: process.env.COOKIE_NAME ?? 'vw_auth',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN, // например, .vitawins.ru (опц.)
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true', // в проде true
  COOKIE_SAME_SITE: (process.env.COOKIE_SAME_SITE as 'lax'|'strict'|'none'|undefined) ?? 'lax',
  COOKIE_MAX_AGE: Number(process.env.COOKIE_MAX_AGE ?? 60 * 60 * 24 * 7), // 7d (сек)

  // защита: dev-login должен быть выключен в проде
  DEV_LOGIN_ENABLED: process.env.DEV_LOGIN_ENABLED === 'true' || process.env.NODE_ENV !== 'production',
};

