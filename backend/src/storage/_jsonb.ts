import { sql } from 'drizzle-orm';

/** Массив в JSONB: если value пусто → [] */
export function toJsonbArraySafe(value: unknown) {
    const json = JSON.stringify(value ?? []);
    return sql`${json}::jsonb`;
}

/** Любое значение в JSONB: если value пусто → null */
export function toJsonbSafe(value: unknown) {
    const json = JSON.stringify(value ?? null);
    return sql`${json}::jsonb`;
}
