// src/services/cacheService.ts
import { createHash } from 'crypto';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

export interface CacheEntry<T = unknown> {
    data: T;
    timestamp: number; // ms since epoch
    ttl: number;       // ms
}

export interface CacheStats {
    size: number;
    keys: string[];
    hits: number;
    misses: number;
    hitRate: number; // 0..100
}

export class CacheService {
    private cache = new Map<string, CacheEntry>();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;
    private defaultTtlMinutes: number;
    private enableLogs: boolean;

    private hits = 0;
    private misses = 0;

    constructor(opts?: { cleanupEveryMs?: number; defaultTtlMinutes?: number; enableLogs?: boolean }) {
        const cleanupEveryMs = opts?.cleanupEveryMs ?? 10 * 60 * 1000; // 10 мин
        this.defaultTtlMinutes = opts?.defaultTtlMinutes ?? 60;        // дефолт: 60 мин
        this.enableLogs = !!opts?.enableLogs;

        this.cleanupInterval = setInterval(() => this.cleanup(), cleanupEveryMs);
    }

    /* ------------ Ключи ------------- */

    /** Стабильный stringify (сортирует ключи), одинаковые объекты → одинаковый ключ */
    private stableStringify(v: unknown): string {
        if (v === null || typeof v !== 'object') return JSON.stringify(v);
        if (Array.isArray(v)) return `[${v.map((x) => this.stableStringify(x)).join(',')}]`;
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        return `{${keys.map((k) => JSON.stringify(k) + ':' + this.stableStringify(obj[k])).join(',')}}`;
    }

    /** Генерирует md5-ключ на основе произвольных данных */
    generateKey(data: unknown): string {
        const serialized = this.stableStringify(data);
        return createHash('md5').update(serialized).digest('hex');
    }

    /* ------------ Базовые операции ------------- */

    set<T = unknown>(key: string, data: T, ttlMinutes?: number): void {
        const ttl = (ttlMinutes ?? this.defaultTtlMinutes) * 60 * 1000;
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
    }

    get<T = unknown>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.data as T;
    }

    hasValid(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /** Вернуть из кэша или вычислить/сохранить */
    async getOrSet<T>(key: string, factory: () => Promise<T> | T, ttlMinutes?: number): Promise<T> {
        const hit = this.get<T>(key);
        if (hit !== null) return hit;
        const value = await factory();
        this.set<T>(key, value, ttlMinutes);
        return value;
    }

    /* ------------ Специализированные помощники ------------- */

    /** AI helpers */
    createAIKey(prompt: string, model = 'gpt-4o'): string {
        return this.generateKey({ prompt, model, type: 'ai_response' });
    }
    cacheAIResponse<T = unknown>(prompt: string, response: T, model = 'gpt-4o', ttlMinutes = 120): void {
        this.set<T>(this.createAIKey(prompt, model), response, ttlMinutes);
    }
    getAIResponse<T = unknown>(prompt: string, model = 'gpt-4o'): T | null {
        return this.get<T>(this.createAIKey(prompt, model));
    }

    /** Product helpers */
    cacheProduct<T = unknown>(productId: string | number, data: T, ttlMinutes = 30): void {
        this.set<T>(`product:${productId}`, data, ttlMinutes);
    }
    getProduct<T = unknown>(productId: string | number): T | null {
        return this.get<T>(`product:${productId}`);
    }
    cacheProductList<T = unknown>(data: T, ttlMinutes = 15): void {
        this.set<T>('products:list', data, ttlMinutes);
    }
    getProductList<T = unknown>(): T | null {
        return this.get<T>('products:list');
    }

    /* ------------ Очистка / статистика ------------- */

    /**
     * Очистка: по умолчанию вычищает только протухшие записи.
     * Если передан olderThanMs — чистит всё, что старше порога, вне зависимости от TTL.
     * Возвращает количество удалённых ключей.
     */
    cleanup(olderThanMs?: number): number {
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of this.cache.entries()) {
            const expired = now - entry.timestamp > entry.ttl;
            const tooOld = olderThanMs ? now - entry.timestamp > olderThanMs : false;
            if (expired || tooOld) {
                this.cache.delete(key);
                removed++;
            }
        }
        if (this.enableLogs) {
            // eslint-disable-next-line no-console
            console.log(`[CacheService] cleanup removed=${removed} size=${this.cache.size}`);
        }
        return removed;
    }

    /** Инвалидация по префиксу (например, 'product:') */
    invalidateByPrefix(prefix: string): number {
        let removed = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                removed++;
            }
        }
        return removed;
    }

    clear(): void {
        this.cache.clear();
    }

    resetStats(): void {
        this.hits = 0;
        this.misses = 0;
    }

    getStats(): CacheStats {
        const hits = this.hits;
        const misses = this.misses;
        const denom = hits + misses;
        const hitRate = denom ? Number(((hits / denom) * 100).toFixed(2)) : 0;
        return { size: this.cache.size, keys: Array.from(this.cache.keys()), hits, misses, hitRate };
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
    }
}

export const cacheService = new CacheService();
export default cacheService;
