import { z } from 'zod';
import { desc, eq, sql, and, inArray } from 'drizzle-orm';
import { db } from '#db/db';
import {
    withdrawalRequest,
    type WithdrawalRequest,
    type NewWithdrawalRequest,
} from '#db/schema/withdrawals';
import { paymentMethodEnum, withdrawalStatusEnum } from '#db/schema/enums';
import { ledgerStorage } from '#storage/ledgerStorage';

// =============================
// Enums → Zod
// =============================
type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
type WithdrawalStatus = (typeof withdrawalStatusEnum.enumValues)[number];

const ZPaymentMethod = z.enum(paymentMethodEnum.enumValues as [PaymentMethod, ...PaymentMethod[]]);

// =============================
// DTO схемы
// =============================
const CreateWithdrawalSchema = z.object({
    userId: z.string().uuid(),
    amountRub: z
        .union([z.string(), z.number()])
        .transform(normalizeMoneyRub)
        .refine((v) => +v > 0, 'amount must be > 0'),
    method: ZPaymentMethod,
    destination: z.record(z.string(), z.any()).default({}),
    idempotencyKey: z.string().min(8).max(256),
    metadata: z.record(z.string(), z.any()).optional(),
});

const ApproveSchema = z.object({
    id: z.string().uuid(),
    adminId: z.string().uuid(),
    note: z.string().max(1000).optional(),
});

const RejectSchema = z.object({
    id: z.string().uuid(),
    adminId: z.string().uuid(),
    reason: z.string().min(2).max(2000),
});

const MarkPaidSchema = z.object({
    id: z.string().uuid(),
    adminId: z.string().uuid(),
    providerInfo: z.record(z.string(), z.any()).default({}),
});

// =============================
// Утилиты
// =============================
function normalizeMoneyRub(v: string | number): string {
    if (typeof v === 'number') return v.toFixed(2);
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error('Invalid amount');
    return n.toFixed(2);
}

function nowIso() {
    return new Date().toISOString();
}

function mergePayload(base: any, patch: any) {
    return { ...(base ?? {}), ...(patch ?? {}) };
}

// =============================
// Error
// =============================
export class ServiceError extends Error {
    code: string;
    status: number;
    details?: unknown;

    constructor(code: string, message: string, status = 400, details?: unknown) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

// =============================
// Сервис
// =============================
export class WithdrawalsService {
    async listAll(
        filters: { userId?: string; status?: WithdrawalStatus; limit?: number; offset?: number } = {},
    ): Promise<WithdrawalRequest[]> {
        const { userId, status, limit = 100, offset = 0 } = filters;
        const conds: any[] = [];
        if (userId) conds.push(eq(withdrawalRequest.userId, userId));
        if (status) conds.push(eq(withdrawalRequest.status, status));

        let qb = db
            .select()
            .from(withdrawalRequest)
            .orderBy(desc(withdrawalRequest.createdAt))
            .limit(limit)
            .offset(offset)
            .$dynamic();

        if (conds.length) qb = qb.where(and(...conds));
        return qb as any;
    }

    /**
     * create()
     * Идемпотентность + заморозка средств
     */
    async create(input: z.infer<typeof CreateWithdrawalSchema>): Promise<WithdrawalRequest> {
        const dto = CreateWithdrawalSchema.parse(input);

        return db.transaction(async (tx) => {
            // 0. Идемпотентность
            const existing = await tx
                .select()
                .from(withdrawalRequest)
                .where(eq(withdrawalRequest.userId, dto.userId))
                .orderBy(desc(withdrawalRequest.createdAt));

            const dup = existing.find((w) => (w.payload as any)?.idempotencyKey === dto.idempotencyKey);
            if (dup) return dup;

            // 1. Лочим ledger_account
            const lockRes = await tx.execute(sql`
                SELECT *
                FROM ledger_account
                WHERE owner_id = ${dto.userId}
                  AND account_type = 'referral'
                  AND currency = 'RUB'
                    FOR UPDATE
            `);

            const lockedAccount = lockRes.rows[0];

            if (!lockedAccount) {
                throw new ServiceError('NO_ACCOUNT', 'У пользователя нет счёта для вывода', 404);
            }

            const balance = Number(lockedAccount.amount);
            const requested = Number(dto.amountRub);

            if (balance < requested) {
                throw new ServiceError(
                    'INSUFFICIENT_BALANCE',
                    `Недостаточно средств: доступно ${balance}, требуется ${requested}`,
                    400,
                );
            }

            // 2. Лимит активных запросов
            const activeStatuses: WithdrawalStatus[] = ['requested', 'in_review', 'approved'];

            const cntRows = await tx
                .select({ count: sql<number>`COUNT(*)` })
                .from(withdrawalRequest)
                .where(
                    and(
                        eq(withdrawalRequest.userId, dto.userId),
                        inArray(withdrawalRequest.status, activeStatuses),
                    ),
                );

            const activeCount = Number(cntRows[0]?.count ?? 0);

            if (activeCount >= 5) {
                throw new ServiceError('RATE_LIMIT', 'Слишком много активных запросов', 429);
            }

            // 3. Создать withdrawal_request
            const payload = {
                idempotencyKey: dto.idempotencyKey,
                destination: dto.destination,
                metadata: dto.metadata ?? {},
                transitions: [],
            };

            const toInsert: NewWithdrawalRequest = {
                userId: dto.userId,
                amountRub: dto.amountRub,
                method: dto.method,
                status: 'requested',
                payload,
            };

            const [created] = await tx
                .insert(withdrawalRequest)
                .values(toInsert)
                .returning();

            if (!created) {
                throw new ServiceError('CREATE_FAILED', 'Не удалось создать запрос на вывод', 500);
            }

            // 4. Блокировка средств: referral → reserve_special
            //    ledger_op_type = 'withdrawal_request'
            const debitAcc = await ledgerStorage.ensureAccount(dto.userId, 'RUB', 'referral');
            const reserveAcc = await ledgerStorage.ensureAccount(null, 'RUB', 'reserve_special', 'system');

            await ledgerStorage.createPosting({
                debitAccountId: debitAcc.id,
                creditAccountId: reserveAcc.id,
                amount: requested,
                currency: 'RUB',
                opType: 'withdrawal_request',
                userId: dto.userId,
                memo: `Withdrawal lock ${created.id}`,
                meta: { withdrawalId: created.id },
            });

            return created;
        });
    }

    /**
     * Approve
     */
    async approve(input: z.infer<typeof ApproveSchema>): Promise<WithdrawalRequest> {
        const dto = ApproveSchema.parse(input);
        const row = await this.requireById(dto.id);

        if (row.status !== 'requested') {
            throw new ServiceError('INVALID_STATE', `Недопустимое состояние: ${row.status}`, 409);
        }

        const newPayload = mergePayload(row.payload, {
            transitions: [
                ...((row.payload as any)?.transitions ?? []),
                { at: nowIso(), action: 'approved', by: dto.adminId, note: dto.note },
            ],
        });

        const [updated] = await db
            .update(withdrawalRequest)
            .set({
                status: 'approved',
                payload: newPayload,
                updatedAt: sql`now()`,
            })
            .where(eq(withdrawalRequest.id, row.id))
            .returning();

        return updated!;
    }

    /**
     * markPaid()
     * Финальное списание reserve_special → cash_rub
     */
    async markPaid(input: z.infer<typeof MarkPaidSchema>): Promise<WithdrawalRequest> {
        const dto = MarkPaidSchema.parse(input);
        const row = await this.requireById(dto.id);

        if (row.status !== 'approved') {
            throw new ServiceError('INVALID_STATE', `Недопустимое состояние: ${row.status}`, 409);
        }

        const newPayload = mergePayload(row.payload, {
            providerInfo: dto.providerInfo,
            transitions: [
                ...((row.payload as any)?.transitions ?? []),
                { at: nowIso(), action: 'paid', by: dto.adminId },
            ],
        });

        return db.transaction(async (tx) => {
            // 1) обновляем withdrawal
            const [updated] = await tx
                .update(withdrawalRequest)
                .set({
                    status: 'paid',
                    payload: newPayload,
                    updatedAt: sql`now()`,
                })
                .where(eq(withdrawalRequest.id, row.id))
                .returning();

            if (!updated) throw new ServiceError('UPDATE_FAILED', 'Failed to update withdrawal', 500);

            // 2) списываем: reserve_special → cash_rub
            const reserveAcc = await ledgerStorage.ensureAccount(null, 'RUB', 'reserve_special', 'system');
            const cashAcc = await ledgerStorage.ensureAccount(null, 'RUB', 'cash_rub', 'system');

            await ledgerStorage.createPosting({
                debitAccountId: reserveAcc.id,
                creditAccountId: cashAcc.id,
                amount: Number(row.amountRub),
                currency: 'RUB',
                opType: 'withdrawal_payout',
                memo: `Withdrawal payout ${row.id}`,
                meta: { withdrawalId: row.id },
            });

            return updated;
        });
    }

    /**
     * Reject: requested | approved → rejected
     */
    async reject(input: z.infer<typeof RejectSchema>): Promise<WithdrawalRequest> {
        const dto = RejectSchema.parse(input);
        const row = await this.requireById(dto.id);

        if (!(row.status === 'requested' || row.status === 'approved')) {
            throw new ServiceError('INVALID_STATE', `Недопустимое состояние: ${row.status}`, 409);
        }

        const newPayload = mergePayload(row.payload, {
            transitions: [
                ...((row.payload as any)?.transitions ?? []),
                { at: nowIso(), action: 'rejected', by: dto.adminId, reason: dto.reason },
            ],
        });

        const [updated] = await db
            .update(withdrawalRequest)
            .set({
                status: 'rejected',
                payload: newPayload,
                updatedAt: sql`now()`,
            })
            .where(eq(withdrawalRequest.id, row.id))
            .returning();

        return updated!;
    }

    /**
     * Получить по id
     */
    async getById(id: string): Promise<WithdrawalRequest | null> {
        if (!id) return null;
        const [row] = await db.select().from(withdrawalRequest).where(eq(withdrawalRequest.id, id));
        return row ?? null;
    }

    async listByUser(userId: string, limit = 50, offset = 0): Promise<WithdrawalRequest[]> {
        if (!userId) return [];
        return db
            .select()
            .from(withdrawalRequest)
            .where(eq(withdrawalRequest.userId, userId))
            .orderBy(desc(withdrawalRequest.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async cancel(id: string, userId: string): Promise<WithdrawalRequest> {
        const parsed = z.object({ id: z.string().uuid(), userId: z.string().uuid() }).parse({ id, userId });
        const row = await this.requireById(parsed.id);

        if (row.userId !== parsed.userId) {
            throw new ServiceError('FORBIDDEN', 'Cannot cancel request of another user', 403);
        }
        if (row.status !== 'requested') {
            throw new ServiceError('INVALID_STATE', `Недопустимое состояние: ${row.status}`, 409);
        }

        const newPayload = mergePayload(row.payload, {
            transitions: [
                ...((row.payload as any)?.transitions ?? []),
                { at: nowIso(), action: 'canceled', by: parsed.userId },
            ],
        });

        const [updated] = await db
            .update(withdrawalRequest)
            .set({ status: 'canceled', payload: newPayload, updatedAt: sql`now()` })
            .where(eq(withdrawalRequest.id, row.id))
            .returning();

        return updated!;
    }

    private async requireById(id: string): Promise<WithdrawalRequest> {
        const row = await this.getById(id);
        if (!row) {
            throw new ServiceError('NOT_FOUND', 'Запрос на вывод не найден', 404);
        }

        const allowed = new Set(withdrawalStatusEnum.enumValues as WithdrawalStatus[]);
        if (!allowed.has(row.status as WithdrawalStatus)) {
            throw new ServiceError('BAD_ENUM', `Неизвестный статус "${row.status}"`, 500, {
                allowed: Array.from(allowed.values()),
            });
        }
        return row;
    }
}

export const withdrawalsService = new WithdrawalsService();
