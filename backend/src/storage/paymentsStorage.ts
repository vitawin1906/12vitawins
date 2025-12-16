// src/storage/paymentsStorage.ts
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '#db/db';
import {
    payment,
    type Payment,
    type NewPayment,
} from '#db/schema/payments';
import {
    paymentStatusEnum,
    paymentMethodEnum,
    currencyEnum,
} from '#db/schema/enums';

/* ───────────────────────── helpers & types ───────────────────────── */

const STATUS_SET   = new Set(paymentStatusEnum.enumValues);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

const METHOD_SET   = new Set(paymentMethodEnum.enumValues);
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];

const CURRENCY_SET = new Set(currencyEnum.enumValues);
export type Currency = (typeof currencyEnum.enumValues)[number];

import { toPgMoney } from '../utils/storageHelpers';

function normalizeNumeric<T extends Partial<NewPayment>>(patch: T): T {
    const out: any = { ...patch };
    if (out.amountRub != null) out.amountRub = toPgMoney(out.amountRub)!;
    return out;
}

function assertStatus(st: string) {
    if (!STATUS_SET.has(st as PaymentStatus)) throw new Error(`Invalid status: ${st}`);
}
function assertMethod(m: string) {
    if (!METHOD_SET.has(m as PaymentMethod)) throw new Error(`Invalid payment method: ${m}`);
}
function assertCurrency(c: string) {
    if (!CURRENCY_SET.has(c as Currency)) throw new Error(`Invalid currency: ${c}`);
}

/* ───────────────────────── CRUD ───────────────────────── */

async function createPayment(input: NewPayment): Promise<Payment> {
    if (input.status)   assertStatus(input.status as string);
    if (input.method)   assertMethod(input.method as string);
    if (input.currency) assertCurrency(input.currency as string);

    const [row] = await db.insert(payment).values(normalizeNumeric(input)).returning();
    return row!;
}

/** Upsert по externalId (уникален, кроме NULL). Если externalId нет — обычный insert. */
async function upsertByExternalId(input: NewPayment): Promise<Payment> {
    if (input.status)   assertStatus(input.status as string);
    if (input.method)   assertMethod(input.method as string);
    if (input.currency) assertCurrency(input.currency as string);

    if (!input.externalId) {
        const [created] = await db.insert(payment).values(normalizeNumeric(input)).returning();
        return created!;
    }

    const [row] = await db
        .insert(payment)
        .values(normalizeNumeric(input))
        .onConflictDoUpdate({
            target: payment.externalId, // нужен уникальный индекс в схеме
            set: normalizeNumeric({
                status:       input.status,
                method:       input.method ?? undefined,
                amountRub:    input.amountRub,
                currency:     input.currency, // по CHECK всё равно 'RUB'
                authorizedAt: input.authorizedAt ?? undefined,
                capturedAt:   input.capturedAt ?? undefined,
                refundedAt:   input.refundedAt ?? undefined,
                errorCode:    input.errorCode ?? undefined,
                errorMessage: input.errorMessage ?? undefined,
            }),
        })
        .returning();

    return row!;
}

async function getPaymentById(id: string): Promise<Payment | null> {
    const [row] = await db.select().from(payment).where(eq(payment.id, id)).limit(1);
    return row ?? null;
}

async function getByExternalId(externalId: string): Promise<Payment | null> {
    const [row] = await db.select().from(payment).where(eq(payment.externalId, externalId)).limit(1);
    return row ?? null;
}

async function listByOrder(orderId: string): Promise<Payment[]> {
    return db
        .select()
        .from(payment)
        .where(eq(payment.orderId, orderId))
        .orderBy(asc(payment.createdAt));
}

async function listPayments(params: {
    method?: PaymentMethod;
    status?: PaymentStatus;
    dateFrom?: Date;
    dateTo?: Date;
    orderId?: string;
    limit?: number;
    offset?: number;
    sort?: 'created_asc' | 'created_desc';
} = {}): Promise<Payment[]> {
    const conds: any[] = [];
    if (params.method)   conds.push(eq(payment.method, params.method));
    if (params.status)   conds.push(eq(payment.status, params.status));
    if (params.orderId)  conds.push(eq(payment.orderId, params.orderId));
    if (params.dateFrom) conds.push(gte(payment.createdAt, params.dateFrom));
    if (params.dateTo)   conds.push(lte(payment.createdAt, params.dateTo));

    const orderBy = params.sort === 'created_asc' ? asc(payment.createdAt) : desc(payment.createdAt);

    let qb = db.select().from(payment).orderBy(orderBy).limit(params.limit ?? 50).offset(params.offset ?? 0).$dynamic();
    if (conds.length) qb = qb.where(and(...conds));
    return qb;
}

/* ───────────────────────── Статусы ───────────────────────── */

async function setStatus(id: string, status: PaymentStatus): Promise<Payment | null> {
    assertStatus(status);
    const [row] = await db.update(payment).set({ status }).where(eq(payment.id, id)).returning();
    return row ?? null;
}

async function markInit(id: string)                  { return setStatus(id, 'init'); }
async function markAwaiting(id: string)              { return setStatus(id, 'awaiting'); }
async function markAuthorized(id: string, at?: Date) {
    const [row] = await db
        .update(payment)
        .set({ status: 'authorized', authorizedAt: at ?? new Date() })
        .where(eq(payment.id, id))
        .returning();
    return row ?? null;
}

async function markCaptured(id: string, at?: Date): Promise<Payment | null> {
    const [row] = await db
        .update(payment)
        .set({ status: 'captured', capturedAt: at ?? new Date() })
        .where(eq(payment.id, id))
        .returning();
    return row ?? null;
}

/** alias для совместимости (paid == captured) */
async function markPaid(id: string, at?: Date) {
    return markCaptured(id, at);
}

async function markRefunded(id: string, at?: Date): Promise<Payment | null> {
    const [row] = await db
        .update(payment)
        .set({ status: 'refunded', refundedAt: at ?? new Date() })
        .where(eq(payment.id, id))
        .returning();
    return row ?? null;
}

/** Частичный рефанд: обновляет amountRub и ставит статус 'refunded' */
async function refundPartial(id: string, amountRub: string): Promise<Payment | null> {
    const [row] = await db
        .update(payment)
        .set({
            amountRub: toPgMoney(amountRub)!,
            status: 'refunded',
            refundedAt: new Date(),
        })
        .where(eq(payment.id, id))
        .returning();
    return row ?? null;
}

async function markFailed(
    id: string,
    errorCode?: string | null,
    errorMessage?: string | null,
): Promise<Payment | null> {
    const [row] = await db
        .update(payment)
        .set({
            status: 'failed',
            errorCode: errorCode ?? null,
            errorMessage: errorMessage ?? null,
        })
        .where(eq(payment.id, id))
        .returning();
    return row ?? null;
}

async function setPaymentMethod(id: string, method: PaymentMethod): Promise<Payment | null> {
    assertMethod(method);
    const [row] = await db.update(payment).set({ method }).where(eq(payment.id, id)).returning();
    return row ?? null;
}

/* ───────────────────────── Aggregations ───────────────────────── */

/** Сумма по заказу только со статусом 'captured'. */
async function sumCapturedForOrder(orderId: string): Promise<string> {
    const [row] = await db
        .select({
            total: sql<string>`
        coalesce(
          sum(case when ${payment.status} = 'captured' then ${payment.amountRub} else 0 end),
          0
        )::text
      `,
        })
        .from(payment)
        .where(eq(payment.orderId, orderId));
    return row?.total ?? '0';
}

async function getLatestForOrder(orderId: string): Promise<Payment | null> {
    const [row] = await db
        .select()
        .from(payment)
        .where(eq(payment.orderId, orderId))
        .orderBy(desc(payment.createdAt))
        .limit(1);
    return row ?? null;
}

/* ───────────────────────── Public API object ───────────────────────── */

export const paymentsStorage = {
    // CRUD
    create: createPayment,
    createPayment,
    upsertByExternalId,
    getById: getPaymentById,
    getByExternalId,
    listByOrder,
    list: listPayments,

    // Status helpers
    setStatus,
    updatePaymentStatus: setStatus, // alias for compatibility
    markInit,
    markAwaiting,
    markAuthorized,
    markCaptured,
    markPaid,
    markRefunded,
    refundPartial,
    markFailed,
    setPaymentMethod,

    // Aggregations
    sumCapturedForOrder,
    getLatestForOrder,
};

export default paymentsStorage;
