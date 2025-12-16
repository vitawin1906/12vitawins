// src/services/memoryManager.ts
// Мониторинг памяти процесса Node.js с мягкой/экстренной очисткой

export interface MemoryStats {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
}

export interface MemoryThresholds {
    warning: number;  // MB
    critical: number; // MB
}

type AlertLevel = 'warning' | 'critical';

export class MemoryManager {
    private thresholds: MemoryThresholds = { warning: 150, critical: 250 };
    private alertCallbacks: Array<(level: AlertLevel, stats: MemoryStats) => void> = [];
    private monitoringInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.startMonitoring();
    }

    /** Запуск мониторинга памяти */
    startMonitoring(intervalMs = 300_000) { // каждые 5 минут
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        this.monitoringInterval = setInterval(() => this.checkMemoryUsage(), intervalMs);
        // eslint-disable-next-line no-console
        console.log('[MemoryManager] monitoring started:', { intervalMs, thresholds: this.thresholds });
    }

    /** Остановка мониторинга */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            // eslint-disable-next-line no-console
            console.log('[MemoryManager] monitoring stopped');
        }
    }

    /** Текущие метрики памяти (в MB) */
    getMemoryStats(): MemoryStats {
        const m = process.memoryUsage();
        const toMB = (n: number) => Math.round(n / 1024 / 1024);
        return {
            heapUsed: toMB(m.heapUsed),
            heapTotal: toMB(m.heapTotal),
            external: toMB(m.external),
            rss: toMB(m.rss),
            arrayBuffers: toMB(m.arrayBuffers ?? 0),
        };
    }

    /** Принудительная сборка мусора (нужен запуск Node с --expose-gc) */
    forceGarbageCollection(): boolean {
        const gc = (globalThis as any).gc as (() => void) | undefined;
        if (typeof gc === 'function') {
            gc();
            // eslint-disable-next-line no-console
            console.log('[MemoryManager] forced GC completed');
            return true;
        }
        // eslint-disable-next-line no-console
        console.warn('[MemoryManager] GC is not exposed. Start node with --expose-gc');
        return false;
    }

    /** Пользовательские пороги */
    setThresholds(warning: number, critical: number) {
        this.thresholds = { warning, critical };
        // eslint-disable-next-line no-console
        console.log('[MemoryManager] thresholds updated', this.thresholds);
    }

    /** Подписка на алерты */
    onMemoryAlert(cb: (level: AlertLevel, stats: MemoryStats) => void) {
        this.alertCallbacks.push(cb);
    }

    /** Рекомендации по оптимизации (очень грубо) */
    getOptimizationRecommendations(): string[] {
        const s = this.getMemoryStats();
        const rec: string[] = [];
        if (s.heapUsed > this.thresholds.warning) rec.push('Высокий heap: очистите кэши/снизьте удержание объектов.');
        if (s.external > 50) rec.push('Высокий external: проверьте буферы/стримы/файловые операции.');
        if (s.arrayBuffers > 20) rec.push('Много ArrayBuffer: оптимизируйте работу с бинарными данными/изображениями.');
        if (s.rss > 300) rec.push('Высокий RSS: подумайте о рестарте воркера/процесса по расписанию.');
        return rec;
    }

    /** Освобождение ресурсов */
    destroy() {
        this.stopMonitoring();
        this.alertCallbacks = [];
    }

    // ===== private =====

    private checkMemoryUsage() {
        const stats = this.getMemoryStats();

        if (stats.heapUsed > this.thresholds.critical) {
            this.triggerAlert('critical', stats);
            void this.performEmergencyCleanup(); // не await — запускаем без блокировки цикла событий
        } else if (stats.heapUsed > this.thresholds.warning) {
            this.triggerAlert('warning', stats);
            void this.performGentleCleanup();
        }
    }

    private triggerAlert(level: AlertLevel, stats: MemoryStats) {
        // eslint-disable-next-line no-console
        console.log(`[MemoryManager] ${level.toUpperCase()}`, stats);
        for (const cb of this.alertCallbacks) {
            try { cb(level, stats); } catch (e) { /* eslint-disable-next-line no-console */ console.error(e); }
        }
    }

    private async performGentleCleanup() {
        // eslint-disable-next-line no-console
        console.log('[MemoryManager] gentle cleanup...');
        await this.notifyCleanupServices('gentle');
        this.forceGarbageCollection();
    }

    private async performEmergencyCleanup() {
        // eslint-disable-next-line no-console
        console.log('[MemoryManager] EMERGENCY cleanup!');
        await this.notifyCleanupServices('emergency');
        this.forceGarbageCollection();
        setTimeout(() => { this.forceGarbageCollection(); }, 5_000);
    }

    /** Универсальный safe-импорт */
    private async tryImport<T = any>(candidates: string[]): Promise<T | null> {
        for (const spec of candidates) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const mod = await import(spec);
                return (mod as any) ?? null;
            } catch { /* try next */ }
        }
        return null;
    }

    /** Дёргаем опциональные сервисы очистки, если они есть */
    private async notifyCleanupServices(level: 'gentle' | 'emergency') {
        try {
            // возможные алиасы/пути
            const cacheMod = await this.tryImport([
                '#services/cacheService',
                '#observability/cacheService',
                './cacheService',
            ]);
            const errMod = await this.tryImport([
                '#services/errorMonitoringService',
                '#observability/errorMonitoringService',
                './errorMonitoringService',
            ]);

            const cacheSvc = (cacheMod as any)?.cacheService;
            const errSvc = (errMod as any)?.errorMonitoringService;

            if (level === 'emergency') {
                cacheSvc?.clear?.();
                errSvc?.clearAll?.();
            } else {
                cacheSvc?.cleanup?.();
                errSvc?.cleanup?.(1); // старше 1 часа
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[MemoryManager] cleanup notification error:', e);
        }
    }
}

export const memoryManager = new MemoryManager();

// Грейсфул-шатдаун
process.on('SIGTERM', () => memoryManager.destroy());
process.on('SIGINT',  () => memoryManager.destroy());
