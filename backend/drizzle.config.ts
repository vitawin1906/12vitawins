// backend/drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // указываем ИСХОДНИКИ схем (barrel)
  schema: './src/db/schema/index.ts',
  // куда писать миграции (по умолчанию: ./drizzle)
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
});
