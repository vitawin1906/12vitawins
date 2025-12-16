// src/observability/performanceMonitor.ts
import type { Request, Response, NextFunction } from 'express';
import { performance } from 'node:perf_hooks';
import os from 'node:os';

export interface PerformanceMetric {
    endpoint: string;
    method: string;
    duration: number;         // ms
    timestamp: number;        // epoch ms
    memoryDelta: {
        rss: number; heapUsed: number; heapTotal: number; external: number; arrayBuffers: number;
    };
    statusCode: number;
}

export interface SystemHealth {
    cpu: number; // усреднённая загрузка CPU, %
    memory: { used: number; total: number; percentage: number };
    database: { activeConnections: number; idleConnections: number; waitingCount: number };
    cache: { hitRate: number; size: number };
}

type CacheStatsProvider =
    | (() => Promise<{ hitRate: number; size: number } | null>)
    | (() => { hitRate: number; size: number } | null)
    | null;

type DbStats = { totalCount?: number; idleCount?: number; waitingCount?: number };

export class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private alerts: string[] = [];
    private maxMetrics = 1000;

    // для корректного CPU % по дельте времени
    private lastCpu = process.cpuUsage();
    private lastHr = process.hrtime.bigint();

    constructor(
        private opts: {
            sampleRate?: number;                 // 0..1
            slowMs?: number;                     // порог "медленного" запроса
            highHeapDeltaBytes?: number;         // порог скачка heapUsed
            dbPoolStatsProvider?: () => DbStats; // верни { totalCount, idleCount, waitingCount }
            cacheStatsProvider?: CacheStatsProvider;
            skip?: RegExp;                       // что игнорировать (например, статику)
        } = {}
    ) {
        this.opts.sampleRate ??= 1;
        this.opts.slowMs ??= 2000;
        this.opts.highHeapDeltaBytes ??= 50 * 1024 * 1024; // 50MB
    }

    /** Express middleware */
    createMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            if (this.opts.skip?.test(req.path)) return next();
            if (Math.random() > (this.opts.sampleRate ?? 1)) return next();

            const startT = performance.now();
            const m0 = process.memoryUsage();

            res.on('finish', () => {
                const duration = performance.now() - startT;
                const m1 = process.memoryUsage();

                const metric: PerformanceMetric = {
                    endpoint: req.path,
                    method: req.method,
                    duration: Math.round(duration),
                    timestamp: Date.now(),
                    memoryDelta: {
                        rss: m1.rss - m0.rss,
                        heapUsed: m1.heapUsed - m0.heapUsed,
                        heapTotal: m1.heapTotal - m0.heapTotal,
                        external: m1.external - m0.external,
                        arrayBuffers: m1.arrayBuffers - m0.arrayBuffers,
                    },
                    statusCode: res.statusCode,
                };

                this.addMetric(metric);
                this.evalAlerts(metric);
            });

            next();
        };
    }

    getMetrics(limit = 50) {
        const slice = this.metrics.slice(0, limit);
        const n = Math.min(100, this.metrics.length);
        const recent = this.metrics.slice(0, n);
        const avg = n ? Math.round(recent.reduce((s, m) => s + m.duration, 0) / n) : 0;
        const max = n ? Math.max(...recent.map(m => m.duration)) : 0;
        const min = n ? Math.min(...recent.map(m => m.duration)) : 0;
        const slow = recent.filter(m => m.duration > (this.opts.slowMs ?? 2000)).length;
        const err = recent.filter(m => m.statusCode >= 400).length;

        return {
            recent: slice,
            summary: n ? {
                avgResponseTime: avg,
                maxResponseTime: max,
                minResponseTime: min,
                slowRequestsCount: slow,
                errorRate: Number(((err / n) * 100).toFixed(2)),
                totalRequests: n,
            } : null,
            alerts: this.alerts.slice(0, 10),
        };
    }

    async getSystemHealth(): Promise<SystemHealth> {
        // корректная оценка CPU% по дельте времени и дельте CPU
        const nowHr = process.hrtime.bigint();
        const deltaCpu = process.cpuUsage(this.lastCpu);
        const deltaSec = Number(nowHr - this.lastHr) / 1e9 || 1;
        const cores = os.cpus()?.length || 1;
        const cpuTimeSec = (deltaCpu.user + deltaCpu.system) / 1e6; // мс → сек
        const cpuPct = Math.max(0, Math.min(100, Math.round((cpuTimeSec / deltaSec) * (100 / cores))));

        // обновим маркеры
        this.lastCpu = process.cpuUsage();
        this.lastHr = nowHr;

        const mem = process.memoryUsage();
        const db = this.opts.dbPoolStatsProvider?.() ?? {};
        const cacheRaw = await this.resolveCacheStats();

        return {
            cpu: cpuPct,
            memory: {
                used: mem.heapUsed,
                total: mem.heapTotal,
                percentage: mem.heapTotal ? (mem.heapUsed / mem.heapTotal) * 100 : 0,
            },
            database: {
                activeConnections: Math.max(0, (db.totalCount ?? 0) - (db.idleCount ?? 0)),
                idleConnections: db.idleCount ?? 0,
                waitingCount: db.waitingCount ?? 0,
            },
            cache: {
                hitRate: cacheRaw?.hitRate ?? 0,
                size: cacheRaw?.size ?? 0,
            },
        };
    }

    cleanup(olderThanHours = 24) {
        const cutoff = Date.now() - olderThanHours * 3600 * 1000;
        this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    }

    /* ───────── private ───────── */

    private addMetric(metric: PerformanceMetric) {
        this.metrics.unshift(metric);
        if (this.metrics.length > this.maxMetrics) this.metrics.length = this.maxMetrics;
    }

    private evalAlerts(m: PerformanceMetric) {
        if (m.duration > (this.opts.slowMs ?? 2000)) {
            this.pushAlert(`Slow: ${m.method} ${m.endpoint} ${m.duration}ms`);
        }
        if (m.memoryDelta.heapUsed > (this.opts.highHeapDeltaBytes ?? 50 * 1024 * 1024)) {
            this.pushAlert(`Heap spike: +${(m.memoryDelta.heapUsed / 1024 / 1024).toFixed(1)}MB`);
        }
    }

    private pushAlert(msg: string) {
        this.alerts.unshift(msg);
        if (this.alerts.length > 100) this.alerts.length = 100;
    }

    private async resolveCacheStats() {
        try {
            const p = this.opts.cacheStatsProvider?.();
            return p instanceof Promise ? await p : p ?? null;
        } catch {
            return null;
        }
    }
}

/* ========= singleton ========= */

// Если используешь pg.Pool — пробросим его сюда, чтобы health показывал коннекты.
import { pool } from '#db/db'; // у тебя экспортируется Pool из db.ts

export const performanceMonitor = new PerformanceMonitor({
    sampleRate: 1,                            // собирать все запросы (можно 0.2 для прод)
    slowMs: 2000,
    highHeapDeltaBytes: 50 * 1024 * 1024,
    skip: /\.(js|css|png|jpg|jpeg|gif|ico|svg)$/i, // не шумим по статике
    dbPoolStatsProvider: () => ({
        totalCount: (pool as any).totalCount ?? 0,
        idleCount: (pool as any).idleCount ?? 0,
        waitingCount: (pool as any).waitingCount ?? 0,
    }),
    // cacheStatsProvider: async () => {
    //   // если есть redisCache.getStats() — дерни и верни { hitRate, size }
    //   return { hitRate: 86.5, size: 1234 };
    // },
});

// авто-очистка каждые 6 часов
setInterval(() => performanceMonitor.cleanup(), 6 * 60 * 60 * 1000);
