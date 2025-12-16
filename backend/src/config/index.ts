// src/config/index.ts
import 'dotenv/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import {Pool} from "pg"; // важен именно * as schema

const url = process.env.DATABASE_URL!;
const useSsl = /neon\.tech/.test(url) || /sslmode=require/.test(url);

export const pool = new Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// ↓ типизируем БД schema-дженериком, чтобы появился db.query.product
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export { schema }; // опционально, но удобно
