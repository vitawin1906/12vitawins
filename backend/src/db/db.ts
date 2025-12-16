import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '#db/schema';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    // Эти опции поддерживаются node-postgres:
    statement_timeout: 10_000,                     // таймаут одного запроса
    query_timeout: 10_000,                         // таймаут ожидания ответа
    idle_in_transaction_session_timeout: 10_000,   // зависшие транзакции
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

// Утилита для мониторинга (можно звать из healthcheck)
export const getPoolStatus = () => ({
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
});
