// src/services/walletService.ts
import { db } from '#db/db';
import { and, desc, eq } from 'drizzle-orm';
import {
    ledgerAccount,
    ledgerPosting,
    ledgerTxn,
    type LedgerAccount,
    type LedgerPosting,
    type LedgerTxn,
} from '#db/schema/ledger';
import { currencyEnum, ledgerOpTypeEnum, accountTypeEnum, ownerTypeEnum } from '#db/schema/enums';
import { ledgerStorage } from '#storage/ledgerStorage';
import { randomUUID } from 'crypto';

/* ───────── types ───────── */

export type Currency     = (typeof currencyEnum.enumValues)[number];        // 'RUB' | 'VWC' | 'PV'
export type LedgerOpType = (typeof ledgerOpTypeEnum.enumValues)[number];
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
export type OwnerType   = (typeof ownerTypeEnum.enumValues)[number];

export type TransferOptions = {
    /** Идемпотентность: если передан, повторный вызов вернёт ту же txn/postings. */
    operationId?: string;
    /** Отображаемый комментарий. */
    memo?: string;
    /** Любые дополнительные данные. */
    meta?: Record<string, unknown>;
    /** Привязка к заказу (для отчётности). */
    orderId?: string;
    /** Владелец пользовательского счёта (для аналитики в txn). */
    userId?: string;
};

export type StatementItem = LedgerPosting;
export type BalanceInfo = { account: LedgerAccount; balance: number };

/* ───────── helpers ───────── */

function must<T>(v: T | null | undefined, msg = 'Not found'): asserts v is NonNullable<T> {
    if (v == null) throw new Error(msg);
}

/** NUMERIC → string(2) */
function toPgNum(x: number | string): string {
    return typeof x === 'number' ? x.toFixed(2) : x;
}

function assertPositiveAmount(amount: number) {
    if (!(Number.isFinite(amount) && amount > 0)) {
        throw new Error('Amount must be a positive number');
    }
}

async function getPostingsByTxnId(txnId: string): Promise<LedgerPosting[]> {
    return db
        .select()
        .from(ledgerPosting)
        .where(eq(ledgerPosting.txnId, txnId))
        .orderBy(desc(ledgerPosting.createdAt));
}

/**
 * Идемпотентное создание проводки (txn + posting).
 * Если operationId уже есть — возвращаем существующие txn/postings (и проверяем совпадение параметров).
 * Если нет — создаём новую txn с заданным или сгенерированным operationId.
 */
async function ensurePosting(params: {
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    currency: Currency;
    opType: LedgerOpType;
    options?: TransferOptions;
}): Promise<{ txn: LedgerTxn; postings: LedgerPosting[] }> {
    const { debitAccountId, creditAccountId, amount, currency, opType, options } = params;
    assertPositiveAmount(amount);

    // 1) идемпотентность
    const opId = options?.operationId ?? randomUUID();
    const existing = await ledgerStorage.getTxnByOperationId(opId);
    if (existing) {
        const postings = await getPostingsByTxnId(existing.id);
        const p = postings[0];
        if (p) {
            const same =
                p.debitAccountId === debitAccountId &&
                p.creditAccountId === creditAccountId &&
                toPgNum(p.amount as unknown as string) === toPgNum(amount) &&
                p.currency === currency &&
                existing.opType === opType;
            if (!same) throw new Error('operationId reused with different parameters');
        }
        return { txn: existing, postings };
    }

    // 2) валидация счетов/валют
    if (debitAccountId === creditAccountId) {
        throw new Error('Debit and credit accounts must differ');
    }

    const [debitAcc] = await db
        .select({ id: ledgerAccount.id, currency: ledgerAccount.currency })
        .from(ledgerAccount)
        .where(eq(ledgerAccount.id, debitAccountId))
        .limit(1);
    must(debitAcc, 'Debit account not found');

    const [creditAcc] = await db
        .select({ id: ledgerAccount.id, currency: ledgerAccount.currency })
        .from(ledgerAccount)
        .where(eq(ledgerAccount.id, creditAccountId))
        .limit(1);
    must(creditAcc, 'Credit account not found');

    if (debitAcc.currency !== currency || creditAcc.currency !== currency) {
        throw new Error('Account currency mismatch');
    }

    // 3) атомарно создаём txn + posting
    return db.transaction(async (tx) => {
        const [txn] = await tx
            .insert(ledgerTxn)
            .values({
                operationId: opId,
                opType,
                userId: options?.userId ?? null,
                orderId: options?.orderId ?? null,
                meta: options?.meta ?? null,
            })
            .returning();
        must(txn, 'Failed to insert txn');

        const [posting] = await tx
            .insert(ledgerPosting)
            .values({
                txnId: txn.id,
                debitAccountId,
                creditAccountId,
                amount: toPgNum(amount),
                currency,
                memo: options?.memo ?? null,
            })
            .returning();
        must(posting, 'Failed to insert posting');

        return { txn, postings: [posting] };
    });
}

/* ───────── service ───────── */

export const walletService = {
    /** Получить/создать пользовательский счёт. */
    ensureUserAccount(userId: string, currency: Currency, type: AccountType) {
        return ledgerStorage.ensureAccount(userId, currency, type, 'user');
    },

    /** Получить/создать системный счёт (ownerType='system', ownerId=NULL). */
    ensureSystemAccount(currency: Currency, type: AccountType) {
        return ledgerStorage.ensureAccount(null, currency, type, 'system');
    },

    /** Баланс пользователя по конкретному счёту. */
    async getUserBalance(userId: string, currency: Currency, type: AccountType): Promise<BalanceInfo> {
        const acc = await this.ensureUserAccount(userId, currency, type);
        const balance = await ledgerStorage.getBalance(acc.id);
        return { account: acc, balance };
    },

    /** Выписка по счёту пользователя. */
    async getUserStatement(
        userId: string,
        currency: Currency,
        type: AccountType,
        limit = 50,
        offset = 0,
    ): Promise<StatementItem[]> {
        const acc = await this.ensureUserAccount(userId, currency, type);
        return ledgerStorage.listTransactions(acc.id, limit, offset);
    },

    /**
     * Универсальный перевод между ДВУМЯ счётами (одна проводка).
     * Увеличивает баланс debitAccountId и уменьшает баланс creditAccountId.
     */
    async transferByAccounts(
        debitAccountId: string,
        creditAccountId: string,
        amount: number,
        currency: Currency,
        opType: LedgerOpType,
        options?: TransferOptions,
    ) {
        return ensurePosting({
            debitAccountId,
            creditAccountId,
            amount,
            currency,
            opType,
            ...(options ? { options } : {}),
        });
    },

    /**
     * Пополнение пользовательского счёта из системного (increase user balance).
     * По двойной записи: DEBIT user, CREDIT system.
     */
    async creditUser(
        userId: string,
        amount: number,
        params: {
            currency: Currency;
            userType?: AccountType;          // счёт пользователя
            systemType?: AccountType;        // счёт системы-источника
            opType: LedgerOpType;            // например, 'topup', 'reward', 'refund'
            options?: TransferOptions;
        },
    ) {
        const { currency, userType = 'cash_rub', systemType = 'network_fund', opType, options } = params;
        const userAcc   = await this.ensureUserAccount(userId, currency, userType);
        const systemAcc = await this.ensureSystemAccount(currency, systemType);

        const mergedOptions: TransferOptions = { ...(options ?? {}), userId };

        return ensurePosting({
            debitAccountId: userAcc.id,        // + для пользователя
            creditAccountId: systemAcc.id,     // - для системы
            amount,
            currency,
            opType,
            options: mergedOptions,
        });
    },

    /**
     * Списание с пользовательского счёта в пользу системы (decrease user balance).
     * По двойной записи: DEBIT system, CREDIT user.
     */
    async debitUser(
        userId: string,
        amount: number,
        params: {
            currency: Currency;
            userType?: AccountType;           // счёт пользователя
            systemType?: AccountType;         // счёт системы-приёмника
            opType: LedgerOpType;             // например, 'order_payment', 'transfer_out'
            options?: TransferOptions;
        },
    ) {
        const { currency, userType = 'cash_rub', systemType = 'cash_rub', opType, options } = params;
        const userAcc   = await this.ensureUserAccount(userId, currency, userType);
        const systemAcc = await this.ensureSystemAccount(currency, systemType);

        // анти-овердрафт
        const balance = await ledgerStorage.getBalance(userAcc.id);
        if (balance < amount) throw new Error('Insufficient funds');

        const mergedOptions: TransferOptions = { ...(options ?? {}), userId };

        return ensurePosting({
            debitAccountId: systemAcc.id,      // + системе
            creditAccountId: userAcc.id,       // - пользователю
            amount,
            currency,
            opType,
            options: mergedOptions,
        });
    },

    /**
     * Перевод между пользователями (одно движение).
     * По двойной записи: DEBIT получатель, CREDIT отправитель.
     */
    async transferUserToUser(
        fromUserId: string,
        toUserId: string,
        amount: number,
        params: {
            currency: Currency;
            fromType?: AccountType;
            toType?: AccountType;
            opType?: LedgerOpType;            // например, 'transfer'
            options?: TransferOptions;
        },
    ) {
        const { currency, fromType = 'cash_rub', toType = 'cash_rub', opType = 'transfer' as LedgerOpType, options } = params;

        const fromAcc = await this.ensureUserAccount(fromUserId, currency, fromType);
        const toAcc   = await this.ensureUserAccount(toUserId,   currency, toType);

        if (fromAcc.id === toAcc.id) throw new Error('Cannot transfer to the same account');

        // анти-овердрафт
        const balance = await ledgerStorage.getBalance(fromAcc.id);
        if (balance < amount) throw new Error('Insufficient funds');

        const mergedOptions: TransferOptions = { ...(options ?? {}), userId: fromUserId };

        return ensurePosting({
            debitAccountId: toAcc.id,          // + получателю
            creditAccountId: fromAcc.id,       // - отправителю
            amount,
            currency,
            opType,
            options: mergedOptions,
        });
    },

    /**
     * Оплата заказа из кошелька пользователя.
     * CREDIT user (уменьшение), DEBIT системный счёт приёма.
     */
    async payOrderFromWallet(
        userId: string,
        orderId: string,
        amount: number,
        params: {
            currency: Currency;
            userType?: AccountType;            // обычно 'cash_rub'
            systemType?: AccountType;          // приёмник ('cash_rub' или 'reserve_special')
            options?: Omit<TransferOptions, 'orderId'>;
        },
    ) {
        const { currency, userType = 'cash_rub', systemType = 'cash_rub', options } = params;
        const mergedOptions: TransferOptions = { ...(options ?? {}), orderId };

        return this.debitUser(userId, amount, {
            currency,
            userType,
            systemType,
            opType: 'order_payment' as LedgerOpType,
            options: mergedOptions,
        });
    },

    /**
     * Возврат в кошелёк пользователя по заказу.
     * DEBIT user (увеличение), CREDIT системный счёт источника.
     */
    async refundOrderToWallet(
        userId: string,
        orderId: string,
        amount: number,
        params: {
            currency: Currency;
            userType?: AccountType;            // обычно 'cash_rub'
            systemType?: AccountType;          // источник ('cash_rub' или 'reserve_special')
            options?: Omit<TransferOptions, 'orderId'>;
        },
    ) {
        const { currency, userType = 'cash_rub', systemType = 'cash_rub', options } = params;
        const mergedOptions: TransferOptions = { ...(options ?? {}), orderId };

        return this.creditUser(userId, amount, {
            currency,
            userType,
            systemType,
            opType: 'refund' as LedgerOpType,
            options: mergedOptions,
        });
    },

    /* ───────── проверки/агрегаты ───────── */

    /** Свести баланс по всем счетам пользователя указанной валюты. */
    async getUserBalancesByCurrency(userId: string, currency: Currency): Promise<BalanceInfo[]> {
        const accounts = await db
            .select()
            .from(ledgerAccount)
            .where(and(eq(ledgerAccount.ownerType, 'user'), eq(ledgerAccount.ownerId, userId), eq(ledgerAccount.currency, currency)));

        const list: BalanceInfo[] = [];
        for (const acc of accounts) {
            const balance = await ledgerStorage.getBalance(acc.id);
            list.push({ account: acc, balance });
        }
        return list;
    },

    /** Найти txn по operationId и отдать вместе с проводками. */
    async findOperation(operationId: string): Promise<{ txn: LedgerTxn; postings: LedgerPosting[] } | null> {
        const txn = await ledgerStorage.getTxnByOperationId(operationId);
        if (!txn) return null;
        const postings = await getPostingsByTxnId(txn.id);
        return { txn, postings };
    },

    /** Простой health-check согласованности: сумма по счету = агрегат из проводок. */
    async checkAccountConsistency(accountId: string): Promise<{ accountId: string; balance: number }> {
        const balance = await ledgerStorage.getBalance(accountId);
        return { accountId, balance };
    },

    /* ───────── низкоуровневые утилиты ───────── */

    /** Универсальный помощник: получить или создать счёт по владельцу/типу/валюте. */
    ensureAccount(ownerId: string | null, currency: Currency, type: AccountType, ownerType: OwnerType = 'user') {
        return ledgerStorage.ensureAccount(ownerId, currency, type, ownerType);
    },

    /** Сумма по счёту (через storage). */
    getBalance(accountId: string) {
        return ledgerStorage.getBalance(accountId);
    },

    /** История движений по счёту (через storage). */
    listTransactions(accountId: string, limit?: number, offset?: number) {
        return ledgerStorage.listTransactions(accountId, limit, offset);
    },
};

export default walletService;
