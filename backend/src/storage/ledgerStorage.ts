// src/storage/ledgerStorage.ts
import { db } from '#db/db';
import {
    ledgerAccount,
    ledgerPosting,
    ledgerTxn,
    type LedgerAccount,
    type LedgerTxn,
    type LedgerPosting,
} from '#db/schema/ledger';
import { and, eq, sql, desc, isNull, inArray } from 'drizzle-orm';
import { currencyEnum, ledgerOpTypeEnum } from '#db/schema/enums';
import { randomUUID } from 'crypto';

type Currency     = (typeof currencyEnum.enumValues)[number];        // 'RUB' | 'VWC' | 'PV'
type LedgerOpType = (typeof ledgerOpTypeEnum.enumValues)[number];
type AccountType  = 'cash_rub' | 'pv' | 'vwc' | 'referral' | 'reserve_special' | 'network_fund';
type OwnerType    = 'user' | 'system';

/** Вью-модель постинга с данными транзакции (для контроллеров) */
export type LedgerPostingView = {
    id: string;                // posting id
    opType: LedgerOpType;
    currency: Currency;
    amount: string;            // NUMERIC приходит как string
    createdAt: Date;
    memo: string | null;
    operationId: string | null;
};

/* ───────── helpers ───────── */
function must<T>(row: T | undefined, msg = 'Row not found'): T {
    if (row === undefined) throw new Error(msg);
    return row;
}
/** NUMERIC → string */
const toPgNum = (x: number | string) => (typeof x === 'number' ? x.toFixed(2) : x);

/* ───────── storage ───────── */
export const ledgerStorage = {
    /**
     * Получить/создать счёт. Для системных счетов ownerType='system', ownerId=null.
     * Ожидается, что в БД есть UNIQUE(owner_type, owner_id, currency, type).
     */
    async ensureAccount(
        ownerId: string | null,
        currency: Currency,
        type: AccountType,
        ownerType: OwnerType = 'user',
    ): Promise<LedgerAccount> {
        const ownerIdVal = ownerType === 'system' ? null : ownerId ?? null;

        const [existing] = await db
            .select()
            .from(ledgerAccount)
            .where(
                and(
                    eq(ledgerAccount.ownerType, ownerType),
                    ownerIdVal === null ? isNull(ledgerAccount.ownerId) : eq(ledgerAccount.ownerId, ownerIdVal),
                    eq(ledgerAccount.currency, currency),
                    eq(ledgerAccount.type, type),
                ),
            )
            .limit(1);

        if (existing) return existing;

        const [created] = await db
            .insert(ledgerAccount)
            .values({ ownerType, ownerId: ownerIdVal, type, currency })
            .onConflictDoNothing()
            .returning();

        if (created) return created;

        const [row] = await db
            .select()
            .from(ledgerAccount)
            .where(
                and(
                    eq(ledgerAccount.ownerType, ownerType),
                    ownerIdVal === null ? isNull(ledgerAccount.ownerId) : eq(ledgerAccount.ownerId, ownerIdVal),
                    eq(ledgerAccount.currency, currency),
                    eq(ledgerAccount.type, type),
                ),
            )
            .limit(1);

        return must(row, 'ensureAccount failed to upsert');
    },

    /** Баланс: сумма дебетов – кредитов (по всем проводкам счёта). */
    async getBalance(accountId: string): Promise<number> {
        const res = await db.execute<{ balance: string }>(sql`
            SELECT COALESCE(SUM(
                                    CASE
                                        WHEN debit_account_id  = ${accountId} THEN amount
                                        WHEN credit_account_id = ${accountId} THEN -amount
                                        ELSE 0
                                        END
                            ), 0) AS balance
            FROM ${ledgerPosting};
        `);

        const row = res.rows?.[0];
        return Number(row?.balance ?? 0);
    },

    /** История проводок по счёту (дебет/кредит). */
    listTransactions(accountId: string, limit = 50, offset = 0): Promise<LedgerPosting[]> {
        return db
            .select()
            .from(ledgerPosting)
            .where(
                sql`${ledgerPosting.debitAccountId} = ${accountId} OR ${ledgerPosting.creditAccountId} = ${accountId}`,
            )
            .orderBy(desc(ledgerPosting.createdAt))
            .limit(limit)
            .offset(offset);
    },

    /**
     * Создать двойную проводку (txn + posting).
     * Предполагается, что currency у обоих счетов совпадает (валидируется на уровне приложения/БД).
     */
    async createPosting(params: {
        debitAccountId: string;
        creditAccountId: string;
        amount: number;
        currency: Currency;
        opType: LedgerOpType;
        userId?: string;
        orderId?: string;
        memo?: string;
        meta?: Record<string, unknown>;
    }): Promise<{ txn: LedgerTxn; postings: LedgerPosting[] }> {
        const opId = randomUUID();

        return db.transaction(async (tx) => {
            const [txn] = await tx
                .insert(ledgerTxn)
                .values({
                    operationId: opId,
                    opType: params.opType,
                    userId: params.userId ?? null,
                    orderId: params.orderId ?? null,
                    meta: params.meta ?? null,
                })
                .returning();

            const [posting] = await tx
                .insert(ledgerPosting)
                .values({
                    txnId: must(txn).id,
                    debitAccountId: params.debitAccountId,
                    creditAccountId: params.creditAccountId,
                    amount: toPgNum(params.amount),
                    currency: params.currency,
                    memo: params.memo ?? null,
                })
                .returning();

            // ZERO-SUM VALIDATION
            const sumCheck = await tx.execute<{ net: string }>(sql`
                SELECT COALESCE(SUM(
                                        CASE
                                            WHEN debit_account_id IS NOT NULL THEN amount
                                            ELSE 0
                                            END
                                ) - SUM(
                                        CASE
                                            WHEN credit_account_id IS NOT NULL THEN amount
                                            ELSE 0
                                            END
                                    ), 0) as net
                FROM ${ledgerPosting}
                WHERE txn_id = ${must(txn).id}
                  AND currency = ${params.currency}
            `);

            const netAmount = Number(sumCheck.rows[0]?.net ?? 0);
            if (Math.abs(netAmount) > 0.01) {
                throw new Error(`Zero-sum invariant violated: net=${netAmount} for txn ${must(txn).id}`);
            }

            return { txn: must(txn), postings: [must(posting)] };
        });
    },

    /** Все счета пользователя. */
    listAccounts(userId: string): Promise<LedgerAccount[]> {
        return db
            .select()
            .from(ledgerAccount)
            .where(and(eq(ledgerAccount.ownerType, 'user'), eq(ledgerAccount.ownerId, userId)));
    },

    /** Найти транзакцию по operationId (идемпотентность). */
    async getTxnByOperationId(operationId: string): Promise<LedgerTxn | null> {
        const [row] = await db.select().from(ledgerTxn).where(eq(ledgerTxn.operationId, operationId)).limit(1);
        return row ?? null;
    },

    /* ─────────── добавлено для контроллера ─────────── */

    /** Проводки пользователя. */
    async listUserTransactions(
        userId: string,
        opts: { limit?: number; offset?: number } = {},
    ): Promise<LedgerPostingView[]> {
        const limit = opts.limit ?? 50;
        const offset = opts.offset ?? 0;

        const accounts = await this.listAccounts(userId);
        const ids = accounts.map((a) => a.id);
        if (ids.length === 0) return [];

        const rows = await db
            .select({
                id: ledgerPosting.id,
                opType: ledgerTxn.opType,
                currency: ledgerPosting.currency,
                amount: ledgerPosting.amount,
                createdAt: ledgerPosting.createdAt,
                memo: ledgerPosting.memo,
                operationId: ledgerTxn.operationId,
            })
            .from(ledgerPosting)
            .innerJoin(ledgerTxn, eq(ledgerPosting.txnId, ledgerTxn.id))
            .where(
                sql`${inArray(ledgerPosting.debitAccountId, ids)} OR ${inArray(ledgerPosting.creditAccountId, ids)}`,
            )
            .orderBy(desc(ledgerPosting.createdAt))
            .limit(limit)
            .offset(offset);

        return rows as unknown as LedgerPostingView[];
    },

    /** Все проводки системы. */
    async listAllTransactions(opts: { limit?: number; offset?: number } = {}): Promise<LedgerPostingView[]> {
        const limit = opts.limit ?? 50;
        const offset = opts.offset ?? 0;

        const rows = await db
            .select({
                id: ledgerPosting.id,
                opType: ledgerTxn.opType,
                currency: ledgerPosting.currency,
                amount: ledgerPosting.amount,
                createdAt: ledgerPosting.createdAt,
                memo: ledgerPosting.memo,
                operationId: ledgerTxn.operationId,
            })
            .from(ledgerPosting)
            .innerJoin(ledgerTxn, eq(ledgerPosting.txnId, ledgerTxn.id))
            .orderBy(desc(ledgerPosting.createdAt))
            .limit(limit)
            .offset(offset);

        return rows as unknown as LedgerPostingView[];
    },

    /** Все счета. */
    async listAllAccounts(opts: { limit?: number; offset?: number } = {}): Promise<LedgerAccount[]> {
        const limit = opts.limit ?? 50;
        const offset = opts.offset ?? 0;

        return db
            .select()
            .from(ledgerAccount)
            .orderBy(desc((ledgerAccount as any).createdAt ?? ledgerAccount.id))
            .limit(limit)
            .offset(offset);
    },

    /**
     * Reverse transaction
     */
    async reverseTransaction(
        txnId: string,
        reason: string = 'Reversal'
    ): Promise<{ txn: LedgerTxn; postings: LedgerPosting[] }> {
        return db.transaction(async (tx) => {
            const [originalTxn] = await tx
                .select()
                .from(ledgerTxn)
                .where(eq(ledgerTxn.id, txnId))
                .limit(1);

            if (!originalTxn) {
                throw new Error(`Transaction ${txnId} not found`);
            }

            if (originalTxn.reversedAt) {
                throw new Error(`Transaction ${txnId} already reversed at ${originalTxn.reversedAt}`);
            }

            const originalPostings = await tx
                .select()
                .from(ledgerPosting)
                .where(eq(ledgerPosting.txnId, txnId));

            if (originalPostings.length === 0) {
                throw new Error(`No postings found for transaction ${txnId}`);
            }

            const reversalOpId = randomUUID();
            const [reversalTxn] = await tx
                .insert(ledgerTxn)
                .values({
                    operationId: reversalOpId,
                    opType: 'refund',
                    userId: originalTxn.userId,
                    orderId: originalTxn.orderId,
                    meta: {
                        reversalOf: txnId,
                        reason,
                        originalOpType: originalTxn.opType,
                    },
                })
                .returning();

            const reversalPostings: LedgerPosting[] = [];
            for (const posting of originalPostings) {
                const [reversalPosting] = await tx
                    .insert(ledgerPosting)
                    .values({
                        txnId: must(reversalTxn).id,
                        debitAccountId: posting.creditAccountId,
                        creditAccountId: posting.debitAccountId,
                        amount: posting.amount,
                        currency: posting.currency,
                        memo: `${reason}: reversal of ${posting.id}`,
                    })
                    .returning();

                reversalPostings.push(must(reversalPosting));
            }

            // ZERO-SUM validation for reversal
            for (const posting of reversalPostings) {
                const sumCheck = await tx.execute<{ net: string }>(sql`
                    SELECT COALESCE(SUM(
                        CASE
                            WHEN debit_account_id IS NOT NULL THEN amount
                            ELSE 0
                        END
                    ) - SUM(
                        CASE
                            WHEN credit_account_id IS NOT NULL THEN amount
                            ELSE 0
                        END
                    ), 0) as net
                    FROM ${ledgerPosting}
                    WHERE txn_id = ${must(reversalTxn).id}
                      AND currency = ${posting.currency}
                `);

                const netAmount = Number(sumCheck.rows[0]?.net ?? 0);
                if (Math.abs(netAmount) > 0.01) {
                    throw new Error(
                        `Zero-sum invariant violated in reversal: net=${netAmount} for txn ${must(reversalTxn).id}`
                    );
                }
            }

            await tx
                .update(ledgerTxn)
                .set({
                    reversedAt: new Date(),
                    reversalTxnId: must(reversalTxn).id,
                })
                .where(eq(ledgerTxn.id, txnId));

            return { txn: must(reversalTxn), postings: reversalPostings };
        });
    },

    /** Получить транзакцию + ее reversal */
    async getTransactionWithReversal(txnId: string): Promise<{
        original: LedgerTxn;
        reversal: LedgerTxn | null;
    } | null> {
        const [original] = await db
            .select()
            .from(ledgerTxn)
            .where(eq(ledgerTxn.id, txnId))
            .limit(1);

        if (!original) return null;

        let reversal: LedgerTxn | null = null;
        if (original.reversalTxnId) {
            const [rev] = await db
                .select()
                .from(ledgerTxn)
                .where(eq(ledgerTxn.id, original.reversalTxnId))
                .limit(1);
            reversal = rev ?? null;
        }

        return { original, reversal };
    },

    /* ──────────────── 🔥 ДОБАВЛЕННАЯ ФУНКЦИЯ (вариант А) ─────────────── */

    /**
     * Проверка zero-sum инварианта для произвольной транзакции
     */
    async validateTransactionZeroSum(txnId: string): Promise<boolean> {
        const result = await db.execute(sql`
            SELECT currency,
                   SUM(
                       CASE WHEN debit_account_id IS NOT NULL THEN amount ELSE 0 END
                   ) -
                   SUM(
                       CASE WHEN credit_account_id IS NOT NULL THEN amount ELSE 0 END
                   ) AS total
            FROM ${ledgerPosting}
            WHERE txn_id = ${txnId}
            GROUP BY currency
            HAVING
                   SUM(
                       CASE WHEN debit_account_id IS NOT NULL THEN amount ELSE 0 END
                   ) -
                   SUM(
                       CASE WHEN credit_account_id IS NOT NULL THEN amount ELSE 0 END
                   ) != 0
        `);

        return result.rows.length === 0;
    },
};
