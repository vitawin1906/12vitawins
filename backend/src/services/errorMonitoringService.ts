// src/services/errorMonitoringService.ts
import { randomUUID } from 'crypto';

export type ErrorLevel = 'error' | 'warning' | 'info';

export interface ErrorLog {
    id: string;
    timestamp: number;
    level: ErrorLevel;
    message: string;
    stack?: string;
    context?: any;
    resolved: boolean;
}

/** Универсальный ввод для логгера, совместимый с errorHandler.logError({...}) */
type LogInput = {
    level: ErrorLevel;
    message: string;
    /** можно передать сам error — стек извлечём автоматически */
    error?: unknown;
    /** либо явно стек */
    stack?: string;
    /** поддержим code, сложим в context */
    code?: string | number;
    context?: any;
};

class ErrorMonitoringService {
    private errors: ErrorLog[] = [];
    private maxErrors = 1000;
    private autoCleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startAutoCleanup(); // авто-очистка каждые 6 часов
    }

    // ───────── API ─────────

    /** Перегрузка 1: старый сигнатурный вид */
    logError(level: ErrorLevel, message: string, error?: unknown, context?: any): void;
    /** Перегрузка 2: объектом (как вызывает errorHandler) */
    logError(input: LogInput): void;

    // Реализация перегрузок
    logError(...args: [ErrorLevel, string, unknown?, any?] | [LogInput]): void {
        let level: ErrorLevel;
        let message: string;
        let stack: string | undefined;
        let context: any | undefined;

        if (typeof args[0] === 'object') {
            const input = args[0] as LogInput;
            level = input.level;
            message = input.message;
            // приоритет явного stack, затем stack из error
            stack =
                typeof input.stack === 'string'
                    ? input.stack
                    : input.error instanceof Error
                        ? input.error.stack
                        : undefined;
            context = input.context ?? {};
            if (input.code !== undefined) {
                context = { ...context, code: input.code };
            }
        } else {
            const [lvl, msg, err, ctx] = args as [ErrorLevel, string, unknown?, any?];
            level = lvl;
            message = msg;
            stack = err instanceof Error ? err.stack : undefined;
            context = ctx;
        }

        const entry: ErrorLog = {
            id: this.safeId(),
            timestamp: Date.now(),
            level,
            message,
            ...(stack !== undefined ? { stack } : {}),
            ...(context !== undefined ? { context } : {}),
            resolved: false,
        };

        this.errors.unshift(entry);
        if (this.errors.length > this.maxErrors) {
            this.errors.length = this.maxErrors;
        }

        // консоль — только подсветка уровня
        if (level === 'error') {
            // eslint-disable-next-line no-console
            console.error('Error logged:', { message, stack, context });
        } else if (level === 'warning') {
            // eslint-disable-next-line no-console
            console.warn('Warning logged:', { message, context });
        } else {
            // eslint-disable-next-line no-console
            console.info('Info logged:', { message, context });
        }
    }

    /** Последние ошибки (опц. по уровню) */
    getErrors(limit: number = 50, level?: ErrorLevel): ErrorLog[] {
        const list = level ? this.errors.filter((e) => e.level === level) : this.errors;
        return list.slice(0, limit);
    }

    /** Пометить ошибку как решённую */
    resolveError(errorId: string): boolean {
        const e = this.errors.find((x) => x.id === errorId);
        if (!e) return false;
        e.resolved = true;
        return true;
    }

    /** Статистика */
    getErrorStats(): { total: number; byLevel: Record<ErrorLevel, number>; unresolved: number } {
        const byLevel: Record<ErrorLevel, number> = { error: 0, warning: 0, info: 0 };
        let unresolved = 0;
        for (const e of this.errors) {
            byLevel[e.level] += 1;
            if (!e.resolved) unresolved += 1;
        }
        return { total: this.errors.length, byLevel, unresolved };
    }

    /** Очистка старше N часов */
    cleanup(olderThanHours: number = 24): void {
        const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
        const before = this.errors.length;
        this.errors = this.errors.filter((e) => e.timestamp > cutoff);
        const removed = before - this.errors.length;
        if (removed > 0) {
            // eslint-disable-next-line no-console
            console.log(`Error monitoring cleanup: removed ${removed} old errors`);
        }
    }

    /** Полная очистка буфера */
    clearAll(): void {
        this.errors = [];
    }

    /** Автоклинап */
    startAutoCleanup(periodMs = 6 * 60 * 60 * 1000): void {
        this.stopAutoCleanup();
        this.autoCleanupInterval = setInterval(() => this.cleanup(), periodMs);
    }

    stopAutoCleanup(): void {
        if (this.autoCleanupInterval) {
            clearInterval(this.autoCleanupInterval);
            this.autoCleanupInterval = null;
        }
    }

    /** Грейсфул-shutdown */
    destroy(): void {
        this.stopAutoCleanup();
        this.errors = [];
    }

    // ───────── private ─────────
    private safeId(): string {
        try {
            return randomUUID();
        } catch {
            return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }
    }
}

export const errorMonitoringService = new ErrorMonitoringService();
export default errorMonitoringService;

// Грейсфул-сигналы
process.on('SIGTERM', () => errorMonitoringService.destroy());
process.on('SIGINT', () => errorMonitoringService.destroy());
