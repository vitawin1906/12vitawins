// backend/src/controllers/statsController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';
import { db } from '#db/db';
import { order, appUser, product } from '#db/schema';
import {orderItem} from "#db/schema/orderItem";

const TimeRangeSchema = z.object({
    range: z.enum(['today', 'week', 'month', 'year', 'all']).optional().default('month'),
});

function getDateRange(range: string): { start: Date; end: Date } {
    const now = new Date();
    const end = now;
    let start = new Date();

    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            start.setDate(now.getDate() - 7);
            break;
        case 'month':
            start.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
            start = new Date(0);
            break;
    }
    return { start, end };
}

// Унифицированное приведение числовых значений из PG numeric
const asNumber = (v: unknown): number =>
    typeof v === 'number' ? v : v == null ? 0 : Number(v as any);

export const statsController = {
    getAdminStats: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { range } = TimeRangeSchema.parse(req.query);
            const { start, end } = getDateRange(range);

            // 1) Общая статистика заказов
            const orderStatsArr = await db
                .select({
                    totalOrders: sql<number>`count(*)::int`,
                    totalRevenueRub: sql<number>`COALESCE(sum(${order.totalPayableRub}), 0)::numeric`,
                    avgOrderValueRub: sql<number>`COALESCE(avg(${order.totalPayableRub}), 0)::numeric`,
                    paidOrders: sql<number>`count(case when ${order.status} = 'paid' then 1 end)::int`,
                    pendingOrders: sql<number>`count(case when ${order.status} = 'pending' then 1 end)::int`,
                    canceledOrders: sql<number>`count(case when ${order.status} = 'canceled' then 1 end)::int`,
                })
                .from(order)
                .where(and(gte(order.createdAt, start), lte(order.createdAt, end)));

            const [totals = {
                totalOrders: 0,
                totalRevenueRub: 0,
                avgOrderValueRub: 0,
                paidOrders: 0,
                pendingOrders: 0,
                canceledOrders: 0,
            }] = orderStatsArr;

            // 2) Статистика пользователей (всего - без фильтра по дате)
            const userStatsArr = await db
                .select({
                    totalUsers: sql<number>`count(*)::int`,
                    activeUsers: sql<number>`count(case when ${appUser.isActive} = true then 1 end)::int`,
                    partners: sql<number>`count(case when ${appUser.mlmStatus} = 'partner' then 1 end)::int`,
                    partnersPro: sql<number>`count(case when ${appUser.mlmStatus} = 'partner_pro' then 1 end)::int`,
                })
                .from(appUser);

            // Новые пользователи за период
            const newUsersCount = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(appUser)
                .where(and(gte(appUser.createdAt, start), lte(appUser.createdAt, end)));

            const [uTotals = {
                totalUsers: 0,
                activeUsers: 0,
                partners: 0,
                partnersPro: 0,
            }] = userStatsArr;

            const newUsers = newUsersCount[0]?.count || 0;

            // 3) Топ-товары по продажам (оплаченные)
            let topProducts: any[] = [];
            try {
                topProducts = await db
                    .select({
                        productId: orderItem.productId,
                        productName: sql<string>`COALESCE(${product.name}, ${orderItem.productName})`,
                        totalSold: sql<number>`COALESCE(sum(${orderItem.qty}), 0)::int`,
                        totalRevenueRub: sql<number>`COALESCE(sum(CAST(${orderItem.lineTotalRub} AS numeric)), 0)::numeric`,
                    })
                    .from(orderItem)
                    .innerJoin(order, eq(orderItem.orderId, order.id))
                    .leftJoin(product, eq(orderItem.productId, product.id))
                    .where(and(gte(order.createdAt, start), lte(order.createdAt, end), eq(order.status, 'paid')))
                    .groupBy(orderItem.productId, product.name, orderItem.productName)
                    .orderBy(desc(sql`COALESCE(sum(${orderItem.qty}), 0)`))
                    .limit(10);
            } catch (err) {
                console.error('Error fetching top products:', err);
                topProducts = [];
            }

            // 4) Продажи по дням (последние 30 дней, оплаченные)
            const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let salesByDay: any[] = [];
            try {
                salesByDay = await db
                    .select({
                        date: sql<string>`DATE(${order.createdAt})`,
                        orderCount: sql<number>`count(*)::int`,
                        revenueRub: sql<number>`COALESCE(sum(${order.totalPayableRub}), 0)::numeric`,
                    })
                    .from(order)
                    .where(and(gte(order.createdAt, since30d), eq(order.status, 'paid')))
                    .groupBy(sql`DATE(${order.createdAt})`)
                    .orderBy(sql`DATE(${order.createdAt})`);
            } catch (err) {
                console.error('Error fetching sales by day:', err);
                salesByDay = [];
            }

            // 5) Разбивка по статусам (за период)
            let orderByStatus: any[] = [];
            try {
                orderByStatus = await db
                    .select({
                        status: order.status,
                        count: sql<number>`count(*)::int`,
                        revenueRub: sql<number>`COALESCE(sum(${order.totalPayableRub}), 0)::numeric`,
                    })
                    .from(order)
                    .where(and(gte(order.createdAt, start), lte(order.createdAt, end)))
                    .groupBy(order.status);
            } catch (err) {
                console.error('Error fetching order by status:', err);
                orderByStatus = [];
            }

            // 6) Средний чек по месяцам (за период, оплаченные)
            let avgOrderByPeriod: any[] = [];
            try {
                avgOrderByPeriod = await db
                    .select({
                        period: sql<string>`TO_CHAR(${order.createdAt}, 'YYYY-MM')`,
                        avgOrderRub: sql<number>`COALESCE(avg(${order.totalPayableRub}), 0)::numeric`,
                        orderCount: sql<number>`count(*)::int`,
                    })
                    .from(order)
                    .where(and(gte(order.createdAt, start), lte(order.createdAt, end), eq(order.status, 'paid')))
                    .groupBy(sql`TO_CHAR(${order.createdAt}, 'YYYY-MM')`)
                    .orderBy(sql`TO_CHAR(${order.createdAt}, 'YYYY-MM')`);
            } catch (err) {
                console.error('Error fetching avg order by period:', err);
                avgOrderByPeriod = [];
            }

            const conversionRate =
                totals.totalOrders > 0 ? (totals.paidOrders / totals.totalOrders) * 100 : 0;

            return res.json({
                success: true,
                stats: {
                    range,
                    period: {
                        start: start.toISOString(),
                        end: end.toISOString(),
                    },
                    order: {
                        total: totals.totalOrders,
                        paid: totals.paidOrders,
                        pending: totals.pendingOrders,
                        canceled: totals.canceledOrders,
                        conversionRate: Number(conversionRate.toFixed(2)),
                    },
                    revenue: {
                        totalRub: asNumber(totals.totalRevenueRub),
                        averageRub: asNumber(totals.avgOrderValueRub),
                    },
                    users: {
                        total: uTotals.totalUsers,
                        new: newUsers,
                        active: uTotals.activeUsers,
                        partners: uTotals.partners,
                        partnersPro: uTotals.partnersPro,
                    },
                    topProducts: topProducts.map((p) => ({
                        productId: p.productId,
                        productName: p.productName || 'Unknown',
                        totalSold: p.totalSold,
                        totalRevenueRub: asNumber(p.totalRevenueRub),
                    })),
                    salesByDay: salesByDay.map((s) => ({
                        date: s.date,
                        orderCount: s.orderCount,
                        revenueRub: asNumber(s.revenueRub),
                    })),
                    orderByStatus: orderByStatus.map((s) => ({
                        status: s.status,
                        count: s.count,
                        revenueRub: asNumber(s.revenueRub),
                    })),
                    avgOrderByPeriod: avgOrderByPeriod.map((p) => ({
                        period: p.period,
                        avgOrderRub: asNumber(p.avgOrderRub),
                        orderCount: p.orderCount,
                    })),
                },
            });
        }),
    ],
};
