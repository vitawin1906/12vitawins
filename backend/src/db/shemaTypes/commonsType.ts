import { z } from 'zod';

/** UUID (строка) */
export const uuid = z.string().uuid();
export type UUID = z.infer<typeof uuid>;

/** timestamptz в ISO 8601 (с таймзоной) */
export const timestamp = z.string().datetime();
export type Timestamp = z.infer<typeof timestamp>;

/** PV — целое неотрицательное */
export const pvInt = z.number().int().nonnegative();

/** Идемпотентность (для вебхуков/транзакций) */
export const idempotencyKey = z.string().min(8);

/** telegram_id как строка цифр (безопасно для 64-бит) */
export const telegramIdStr = z.string().regex(/^\d{1,19}$/, 'telegram_id must be digits (1..19)');
export type TelegramIdStr = z.infer<typeof telegramIdStr>;

/** Слаг: латиница/цифры/дефисы, без дефиса по краям */
export const slug = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'only [a-z0-9-], no edge dashes')
    .transform((s) => s.toLowerCase());

/** URL */
export const url = z.string().url();

/** Универсальный JSON */
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export const json: z.ZodType<Json> = z.lazy(() =>
    z.union([
        z.null(),
        z.boolean(),
        z.number(),
        z.string(),
        z.array(json),
        z.record(z.string(), json), // <-- ключ явно: ZodString, значение: json
    ])
);

/** Картинки для каталога/UI: 1..4 url */
export const imagesArray = z.array(url).min(1).max(4);

/** Пэйджинг для списков */
export const pageable = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(20),
});

export type Pageable = z.infer<typeof pageable>;
export const money = z.preprocess((raw) => {
    if (raw === null || raw === undefined || raw === '') return raw;
    if (typeof raw === 'number') return raw.toFixed(2);
    if (typeof raw === 'string') {
        const n = Number(raw.replace(',', '.')); // на всякий случай
        if (Number.isFinite(n)) return n.toFixed(2);
    }
    return raw; // пускай упадёт на следующем шаге валидации
}, z.string().regex(/^\d+(\.\d{2})$/));