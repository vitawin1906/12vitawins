// backend/src/services/paymentTimeoutWorker.ts
import { db } from '#db/db';
import { order } from '#db/schema/orders';
import { payment } from '#db/schema/payments';
import { and, eq, lt, sql } from 'drizzle-orm';
import ordersStorage from '#storage/ordersStorage';
import { promoCodeService } from './promoCodeService';

// 🔐 Distributed Lock
import { createClient } from 'redis';
// @ts-ignore — redlock типы несовместимы с redis v4, но всё работает
import Redlock from 'redlock';

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const redisClient: any = createClient({ url: redisUrl });

// Redis client — singleton
redisClient.connect().catch((err: any) =>
    console.error('Redis connection error in PaymentTimeoutWorker:', err)
);

// Redlock instance
const redlock: any = new Redlock([redisClient], {
    retryCount: 0,
    retryDelay: 200,
    retryJitter: 200,
});

export interface PaymentTimeoutWorkerConfig {
    paymentTimeoutMinutes: number;
    workerIntervalMs: number;
    batchSize: number;
    enableLogging: boolean;
}

const DEFAULT_CONFIG: PaymentTimeoutWorkerConfig = {
    paymentTimeoutMinutes: 30,
    workerIntervalMs: 5 * 60 * 1000,
    batchSize: 50,
    enableLogging: true,
};

export class PaymentTimeoutWorker {
    private config: PaymentTimeoutWorkerConfig;
    private intervalId: NodeJS.Timeout | null = null;

    constructor(config: Partial<PaymentTimeoutWorkerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    start(): void {
        if (this.intervalId) {
            this.log('Worker already running');
            return;
        }

        this.log(`Starting payment-timeout-worker (${this.config.paymentTimeoutMinutes}min timeout)`);

        this.runOnce().catch((err) => console.error('PaymentTimeoutWorker error:', err));

        this.intervalId = setInterval(() => {
            this.runOnce().catch((err) => console.error('PaymentTimeoutWorker error:', err));
        }, this.config.workerIntervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.log('Payment timeout worker stopped');
        }
    }

    async runOnce(): Promise<{ processed: number; errors: number }> {
        let lock: any = null;

        try {
            try {
                lock = await redlock.acquire(['locks:payment-timeout-worker'], 60000);
            } catch {
                this.log('⚠️ Another worker holds the distributed lock — skipping run');
                return { processed: 0, errors: 0 };
            }

            return await this.processTimeouts();
        } finally {
            if (lock) {
                try {
                    await (lock as any).release();
                } catch (err) {
                    console.error('Failed to release payment-timeout-worker lock:', err);
                }
            }
        }
    }

    async processTimeouts(): Promise<{ processed: number; errors: number }> {
        let processed = 0;
        let errors = 0;

        try {
            const timeoutThreshold = new Date(
                Date.now() - this.config.paymentTimeoutMinutes * 60 * 1000
            );

            const timedOutOrders = await db
                .select({
                    id: order.id,
                    userId: order.userId,
                    status: order.status,
                    createdAt: order.createdAt,
                })
                .from(order)
                .where(
                    and(
                        sql`${order.status} IN ('new', 'pending')`,
                        lt(order.createdAt, timeoutThreshold)
                    )
                )
                .limit(this.config.batchSize);

            this.log(`Found ${timedOutOrders.length} timed out orders`);

            for (const ord of timedOutOrders) {
                try {
                    const [successfulPayment] = await db
                        .select()
                        .from(payment)
                        .where(
                            and(
                                eq(payment.orderId, ord.id),
                                eq(payment.status, 'awaiting'),
                            )
                        )
                        .limit(1);

                    if (successfulPayment) {
                        this.log(`Order ${ord.id} has successful payment, skipping`);
                        continue;
                    }

                    await this.cancelTimedOutOrder(ord.id);
                    processed++;
                    this.log(`Cancelled timed out order ${ord.id}`);
                } catch (err) {
                    errors++;
                    console.error(`Error processing order ${ord.id}:`, err);
                }
            }

            this.log(`Processed ${processed} orders, ${errors} errors`);
        } catch (err) {
            console.error('Payment timeout worker error:', err);
            errors++;
        }

        return { processed, errors };
    }

    private async cancelTimedOutOrder(orderId: string): Promise<void> {
        return db.transaction(async (tx) => {
            await promoCodeService.cancelPromoCodeUsage(orderId);

            await ordersStorage.cancel(orderId);

            await tx
                .update(payment)
                .set({
                    status: 'failed',
                    errorMessage: sql`
                        COALESCE(${payment.errorMessage}, '') || ' | Payment timeout'
                    `,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(payment.orderId, orderId),
                        sql`${payment.status} NOT IN ('succeeded', 'refunded', 'canceled')`
                    )
                );
        });
    }

    async runManual(): Promise<{ processed: number; errors: number }> {
        return this.runOnce();
    }

    private log(msg: string) {
        if (this.config.enableLogging) {
            console.log(`[PaymentTimeoutWorker] ${msg}`);
        }
    }
}

export const paymentTimeoutWorker = new PaymentTimeoutWorker();

export function initPaymentTimeoutWorker(config?: Partial<PaymentTimeoutWorkerConfig>): void {
    const worker = config ? new PaymentTimeoutWorker(config) : paymentTimeoutWorker;
    worker.start();

    process.on('SIGTERM', () => worker.stop());
    process.on('SIGINT', () => worker.stop());
}
