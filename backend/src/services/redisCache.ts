// backend/src/services/redisCache.ts

/**
 * Redis Cache Service
 * Simple in-memory cache stub (fallback when Redis is not available)
 */
class RedisCache {
    private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();
    private cleanupIntervalId: NodeJS.Timeout | null = null;
    private defaultTtlSeconds = 20; // Default TTL within 10–30s as requested

    constructor(cleanupEveryMs: number = 5000) {
        // Automatic cleanup of expired keys to prevent memory leaks
        this.cleanupIntervalId = setInterval(() => this.cleanupExpiredKeys(), cleanupEveryMs).unref?.();
    }

    private cleanupExpiredKeys() {
        const now = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiresAt <= now) this.memoryCache.delete(key);
        }
    }

    async get(key: string): Promise<string | null> {
        const cached = this.memoryCache.get(key);
        if (!cached) return null;
        if (Date.now() > cached.expiresAt) {
            this.memoryCache.delete(key);
            return null;
        }
        return cached.value;
    }

    async set(key: string, value: string, ttlSeconds: number = this.defaultTtlSeconds): Promise<void> {
        const ttl = Math.max(1, ttlSeconds | 0); // ensure >=1s integer
        const expiresAt = Date.now() + ttl * 1000;
        this.memoryCache.set(key, { value, expiresAt });
    }

    async del(key: string): Promise<void> {
        this.memoryCache.delete(key);
    }

    async clearCache(pattern?: string): Promise<void> {
        if (pattern) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            for (const key of this.memoryCache.keys()) {
                if (regex.test(key)) {
                    this.memoryCache.delete(key);
                }
            }
        } else {
            this.memoryCache.clear();
        }
    }

    isActive(): boolean {
        return true; // Memory cache always active
    }
}

export const redisCache = new RedisCache();

/* ───────────────── Original Redis Implementation (commented out) ───────────────── */

// import { createClient, type RedisClientType } from "redis";
//
// /**
//  * Redis Cache Service
//  */
// class RedisCache {
//     private client: RedisClientType | null = null;
//     private isConnected = false;
//
//     constructor() {
//         // Redis отключён для Replit или если нет URL
//         if (process.env.REPLIT_ENVIRONMENT || !process.env.REDIS_URL) {
//             console.log("🔧 Redis отключен (нет REDIS_URL или Replit окружение)");
//             return;
//         }
//
//         const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
//
//         this.client = createClient({ url: redisUrl });
//
//         this.client.on("error", (err) => {
//             console.error("Redis error:", err);
//             this.isConnected = false;
//         });
//
//         this.client.on("connect", () => {
//             console.log("✅ Redis connected");
//             this.isConnected = true;
//         });
//
//         this.connect();
//     }
//
//     private async connect() {
//         try {
//             if (this.client) {
//                 await this.client.connect();
//             }
//         } catch (error) {
//             console.error("Failed to connect to Redis:", error);
//         }
//     }
//
//     /* ───────────────── Products Cache ───────────────── */
//
//     async cacheProducts(products: any[], ttl = 300) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             await this.client.setEx("products:all", ttl, JSON.stringify(products));
//         } catch (error) {
//             console.error("Redis cache error:", error);
//         }
//     }
//
//     async getCachedProducts(): Promise<any[] | null> {
//         if (!this.isConnected || !this.client) return null;
//         try {
//             const cached = await this.client.get("products:all");
//             return cached ? JSON.parse(cached) : null;
//         } catch (error) {
//             console.error("Redis get error:", error);
//             return null;
//         }
//     }
//
//     /* ───────────────── Products With Categories ───────────────── */
//
//     async cacheProductsWithCategories(
//         products: any[],
//         params: Record<string, any>,
//         ttl = 300
//     ) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             const key = this.buildProductsKey(params);
//             await this.client.setEx(key, ttl, JSON.stringify(products));
//         } catch (error) {
//             console.error("Redis cache products with categories error:", error);
//         }
//     }
//
//     async getCachedProductsWithCategories(
//         params: Record<string, any>
//     ): Promise<any[] | null> {
//         if (!this.isConnected || !this.client) return null;
//
//         try {
//             const key = this.buildProductsKey(params);
//             const cached = await this.client.get(key);
//             return cached ? JSON.parse(cached) : null;
//         } catch (error) {
//             console.error("Redis get products with categories error:", error);
//             return null;
//         }
//     }
//
//     private buildProductsKey(params: Record<string, any>): string {
//         const sortedKeys = Object.keys(params).sort();
//         const queryString = sortedKeys
//             .map((k) => `${k}=${params[k] ?? ""}`)
//             .join("&");
//         return `products:list:${queryString}`;
//     }
//
//     async invalidateProducts() {
//         await this.clearCache("products:*");
//     }
//
//     /* ───────────────── Single Product Cache ───────────────── */
//
//     async getCachedProduct(id: string): Promise<any | null> {
//         if (!this.isConnected || !this.client) return null;
//         try {
//             const cached = await this.client.get(`product:${id}`);
//             return cached ? JSON.parse(cached) : null;
//         } catch (error) {
//             console.error("Redis product get error:", error);
//             return null;
//         }
//     }
//
//     async cacheProduct(id: string, product: any, ttl = 1800) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             await this.client.setEx(`product:${id}`, ttl, JSON.stringify(product));
//         } catch (error) {
//             console.error("Redis product cache error:", error);
//         }
//     }
//
//     /* ───────────────── Blog Cache ───────────────── */
//
//     async cacheBlogPosts(posts: any[], ttl = 600) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             await this.client.setEx("blog:posts", ttl, JSON.stringify(posts));
//         } catch (error) {
//             console.error("Redis blog cache error:", error);
//         }
//     }
//
//     async getCachedBlogPosts(): Promise<any[] | null> {
//         if (!this.isConnected || !this.client) return null;
//         try {
//             const cached = await this.client.get("blog:posts");
//             return cached ? JSON.parse(cached) : null;
//         } catch (error) {
//             console.error("Redis blog get error:", error);
//             return null;
//         }
//     }
//
//     async invalidateBlogPosts() {
//         await this.clearCache("blog:*");
//     }
//
//     /* ───────────────── Stats Cache ───────────────── */
//
//     async cacheStats(stats: any, ttl = 120) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             await this.client.setEx("stats:general", ttl, JSON.stringify(stats));
//         } catch (error) {
//             console.error("Redis stats cache error:", error);
//         }
//     }
//
//     async getCachedStats(): Promise<any | null> {
//         if (!this.isConnected || !this.client) return null;
//         try {
//             const cached = await this.client.get("stats:general");
//             return cached ? JSON.parse(cached) : null;
//         } catch (error) {
//             console.error("Redis stats get error:", error);
//             return null;
//         }
//     }
//
//     async cacheUserStats(stats: any, ttl = 120) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             await this.client.setEx("stats:users", ttl, JSON.stringify(stats));
//         } catch (error) {
//             console.error("Redis user stats cache error:", error);
//         }
//     }
//
//     async getCachedUserStats(): Promise<any | null> {
//         if (!this.isConnected || !this.client) return null;
//         try {
//             const cached = await this.client.get("stats:users");
//             return cached ? JSON.parse(cached) : null;
//         } catch (error) {
//             console.error("Redis user stats get error:", error);
//             return null;
//         }
//     }
//
//     /* ───────────────── General Cache ───────────────── */
//
//     async clearCache(pattern?: string) {
//         if (!this.isConnected || !this.client) return;
//         try {
//             if (pattern) {
//                 const keys = await this.client.keys(pattern);
//                 if (keys.length > 0) await this.client.del(keys);
//             } else {
//                 await this.client.flushAll();
//             }
//         } catch (error) {
//             console.error("Redis clear error:", error);
//         }
//     }
//
//     isActive(): boolean {
//         return this.isConnected;
//     }
// }
//
// export const redisCache = new RedisCache();
