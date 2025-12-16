import type { Config } from 'drizzle-kit';

export default {
    schema: './src/db/schema.ts',     // путь до твоей схемы (где pgTable)
    out: './drizzle',                 // папка для миграций/метаданных
    driver: 'pg',                     // для Postgres
    dbCredentials: {
        connectionString: process.env.DATABASE_URL!, // твой URL
    },
} satisfies Config;
