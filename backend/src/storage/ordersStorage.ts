// src/storage/ordersStorage.ts
import { and, asc, desc, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '#db/db';
import { order, type Order, type NewOrder } from '#db/schema/orders';
import { orderItem } from '#db/schema/orderItem';
import { product } from '#db/schema/products';
import { orderStatusEnum, deliveryStatusEnum } from '#db/schema/enums';

type OrderStatus    = (typeof orderStatusEnum.enumValues)[number];
type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];

const ORDER_SET    = new Set(orderStatusEnum.enumValues);
const DELIVERY_SET = new Set(deliveryStatusEnum.enumValues);

function assertOrderStatus(v: unknown): asserts v is OrderStatus {
    if (!ORDER_SET.has(v as OrderStatus)) throw new Error(`Invalid status: ${v as string}`);
}
function assertDeliveryStatus(v: unknown): asserts v is DeliveryStatus {
    if (!DELIVERY_SET.has(v as DeliveryStatus)) throw new Error(`Invalid deliveryStatus: ${v as string}`);
}

import { normalizeOrderNumeric as normalizeNumeric, now } from '../utils/storageHelpers';

export const ordersStorage = {
    /** Создать заказ (драфт = pending) */
    async create(input: Partial<NewOrder> & { userId: string }): Promise<Order> {
        if (!input.userId) throw new Error('userId is required');
        if (input.status)         assertOrderStatus(input.status);
        if (input.deliveryStatus) assertDeliveryStatus(input.deliveryStatus);

        const defaults: NewOrder = {
            userId: input.userId,
            status: input.status ?? 'pending',
            deliveryStatus: input.deliveryStatus ?? 'not_required',

            // totals — дефолты из схемы, поэтому можно не задавать явно
            orderBaseRub:   String(input.orderBaseRub ?? '0'),
            pvEarned:       input.pvEarned ?? 0,
            networkFundRub: String(input.networkFundRub ?? '0'),
            vwcCashback:    String(input.vwcCashback ?? '0'),

            deliveredAt: null,
            createdAt: now(),
            updatedAt: now(),
        };

        const [row] = await db.insert(order).values(defaults).returning();
        return row!;
    },

    /** Получить заказ по ID */
    async getById(id: string): Promise<Order | null> {
        const [row] = await db.select().from(order).where(eq(order.id, id)).limit(1);
        return row ?? null;
    },

    /** Получить заказ по externalId (для интеграций) */
    async getByExternalId(_externalId: string): Promise<Order | null> {
        throw new Error('externalId column is not present in orders schema');
    },

    /** Список заказов с простыми фильтрами */
    async list(params: {
        userId?: string;
        status?: OrderStatus;
        deliveryStatus?: DeliveryStatus;
        createdFrom?: Date;
        createdTo?: Date;
        deliveredFrom?: Date;
        deliveredTo?: Date;
        limit?: number;
        offset?: number;
        sort?: 'created_asc' | 'created_desc';
    } = {}): Promise<Order[]> {
        const conds: any[] = [];
        if (params.userId)         conds.push(eq(order.userId, params.userId));
        if (params.status)         conds.push(eq(order.status, params.status));
        if (params.deliveryStatus) conds.push(eq(order.deliveryStatus, params.deliveryStatus));
        if (params.createdFrom)    conds.push(gte(order.createdAt, params.createdFrom));
        if (params.createdTo)      conds.push(lte(order.createdAt, params.createdTo));
        if (params.deliveredFrom)  conds.push(gte(order.deliveredAt, params.deliveredFrom));
        if (params.deliveredTo)    conds.push(lte(order.deliveredAt, params.deliveredTo));

        const orderBy =
            params.sort === 'created_asc' ? asc(order.createdAt) : desc(order.createdAt);

        return db
            .select()
            .from(order)
            .where(conds.length ? (and as any)(...conds) : undefined)
            .orderBy(orderBy)
            .limit(params.limit ?? 50)
            .offset(params.offset ?? 0);
    },

    /** Частичное обновление */
    async update(id: string, patch: Partial<NewOrder>): Promise<Order | null> {
        const validated = normalizeNumeric(patch);
        if (validated.status)         assertOrderStatus(validated.status);
        if (validated.deliveryStatus) assertDeliveryStatus(validated.deliveryStatus);

        const [row] = await db
            .update(order)
            .set({ ...validated, updatedAt: now() })
            .where(eq(order.id, id))
            .returning();
        return row ?? null;
    },

    /** Update order status only */
    async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
        assertOrderStatus(status);
        const [row] = await db
            .update(order)
            .set({ status, updatedAt: now() })
            .where(eq(order.id, id))
            .returning();
        return row ?? null;
    },

    /** Отменить заказ + восстановить stock */
    async cancel(id: string): Promise<Order | null> {
        return db.transaction(async (tx) => {
            // 1. Get order items to restore stock
            const items = await tx
                .select()
                .from(orderItem)
                .where(eq(orderItem.orderId, id));

            // 2. Restore stock for each product
            for (const item of items) {
                await tx.execute(sql`
                    UPDATE ${product}
                    SET stock = stock + ${item.qty},
                        updated_at = NOW()
                    WHERE id = ${item.productId}
                `);
            }

            // 3. Cancel order
            const [row] = await tx
                .update(order)
                .set({ status: 'canceled', updatedAt: now() })
                .where(eq(order.id, id))
                .returning();

            return row ?? null;
        });
    },

    /** Отметить “в пути” */
    async markInTransit(id: string): Promise<Order | null> {
        const [row] = await db
            .update(order)
            .set({ status: 'shipped', deliveryStatus: 'in_transit', updatedAt: now() })
            .where(eq(order.id, id))
            .returning();
        return row ?? null;
    },

    /** Отметить доставленным */
    async markDelivered(id: string): Promise<Order | null> {
        const [row] = await db
            .update(order)
            .set({ status: 'delivered', deliveryStatus: 'delivered', deliveredAt: now(), updatedAt: now() })
            .where(eq(order.id, id))
            .returning();
        return row ?? null;
    },

    /** Найти черновик (драфт = pending) */
    async findDraftOrder(userId: string): Promise<Order | null> {
        const [row] = await db
            .select()
            .from(order)
            .where(and(eq(order.userId, userId), eq(order.status, 'pending')))
            .limit(1);
        return row ?? null;
    },

    /** Найти или создать черновик */
    async findOrCreateDraftOrder(userId: string): Promise<Order> {
        const existing = await this.findDraftOrder(userId);
        if (existing) return existing;

        const defaults: NewOrder = {
            userId,
            status: 'pending',
            deliveryStatus: 'not_required',
            orderBaseRub:   '0',
            pvEarned:       0,
            networkFundRub: '0',
            vwcCashback:    '0',
            deliveredAt: null,
            createdAt: now(),
            updatedAt: now(),
        };

        const [row] = await db.insert(order).values(defaults).returning();
        return row!;
    },

    /** Подсчёт количества заказов по простым фильтрам (для UI/отчётов) */
    async count(params: { userId?: string; status?: OrderStatus } = {}): Promise<number> {
        const conds: any[] = [];
        if (params.userId) conds.push(eq(order.userId, params.userId));
        if (params.status) conds.push(eq(order.status, params.status));

        const [row] = await db
            .select({ cnt: sql<number>`count(*)` })
            .from(order)
            .where(conds.length ? and(...conds) : undefined);

        return Number(row?.cnt ?? 0);
    },

    /** Массовое обновление статуса (админка) */
    async batchUpdateStatus(orderIds: string[], status: OrderStatus): Promise<number> {
        if (orderIds.length === 0) return 0;
        assertOrderStatus(status);

        const res = await db
            .update(order)
            .set({ status, updatedAt: now() })
            .where(inArray(order.id, orderIds as [string, ...string[]]))
            .returning({ id: order.id });

        return res.length;
    },
};

export default ordersStorage;
