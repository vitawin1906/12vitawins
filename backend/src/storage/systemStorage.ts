import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '#db/db';
import {
    notification,
    orderLog,
    userActivityLog,
    analyticsTag,
    type Notification,
    type NewNotification,
    type OrderLog,
    type NewOrderLog,
    type UserActivityLog,
    type NewUserActivityLog,
    type AnalyticsTag,
    type NewAnalyticsTag,
} from '#db/schema/system';

/* ───────── helpers ───────── */

function must<T>(row: T | undefined, msg = 'Row not found'): T {
    if (row === undefined) throw new Error(msg);
    return row;
}

export const systemStorage = {
    /* ─────────────── Notifications ─────────────── */

    async createNotification(input: NewNotification): Promise<Notification> {
        const [row] = await db.insert(notification).values(input).returning();
        return must(row);
    },

    async listPendingNotifications(limit = 100): Promise<Notification[]> {
        return db
            .select()
            .from(notification)
            .where(eq(notification.status, 'pending'))
            .orderBy(asc(notification.createdAt))
            .limit(limit);
    },

    async listUserNotifications(
        userId: string,
        opts: { limit?: number; offset?: number } = {}
    ): Promise<Notification[]> {
        const { limit = 100, offset = 0 } = opts;
        return db
            .select()
            .from(notification)
            .where(eq(notification.userId, userId))
            .orderBy(desc(notification.createdAt))
            .limit(limit)
            .offset(offset);
    },

    async setNotificationStatus(
        id: number,
        status: 'pending' | 'sent' | 'failed',
        sentAt?: Date | null
    ): Promise<Notification | null> {
        const patch: Partial<NewNotification> = { status };
        patch.sentAt = status === 'sent' ? sentAt ?? new Date() : sentAt ?? null;

        const [row] = await db
            .update(notification)
            .set(patch)
            .where(eq(notification.id, id))
            .returning();
        return row ?? null;
    },

    async markNotificationSent(id: number): Promise<Notification | null> {
        return this.setNotificationStatus(id, 'sent', new Date());
    },

    /* ─────────────── Order Logs ─────────────── */

    async addOrderLog(
        orderId: string,
        event: string,
        meta?: Record<string, any>
    ): Promise<OrderLog> {
        const [row] = await db
            .insert(orderLog)
            .values({ orderId, event, meta } satisfies NewOrderLog)
            .returning();
        return must(row);
    },

    async listOrderLogs(orderId: string, limit = 200): Promise<OrderLog[]> {
        return db
            .select()
            .from(orderLog)
            .where(eq(orderLog.orderId, orderId))
            .orderBy(desc(orderLog.createdAt))
            .limit(limit);
    },

    /* ─────────────── User Activity Logs ─────────────── */

    async addUserActivity(
        userId: string,
        action: string,
        meta?: Record<string, any>
    ): Promise<UserActivityLog> {
        const [row] = await db
            .insert(userActivityLog)
            .values({ userId, action, meta } satisfies NewUserActivityLog)
            .returning();
        return must(row);
    },

    async listUserActivity(
        userId: string,
        opts: { limit?: number; since?: Date } = {}
    ): Promise<UserActivityLog[]> {
        const { limit = 200, since } = opts;

        if (since) {
            return db
                .select()
                .from(userActivityLog)
                .where(
                    and(
                        eq(userActivityLog.userId, userId),
                        sql`${userActivityLog.createdAt} >= ${since}`
                    )
                )
                .orderBy(desc(userActivityLog.createdAt))
                .limit(limit);
        }

        return db
            .select()
            .from(userActivityLog)
            .where(eq(userActivityLog.userId, userId))
            .orderBy(desc(userActivityLog.createdAt))
            .limit(limit);
    },

    /* ─────────────── Analytics Tags ─────────────── */

    async createAnalyticsTag(input: NewAnalyticsTag): Promise<AnalyticsTag> {
        const [row] = await db.insert(analyticsTag).values(input).returning();
        return must(row);
    },

    async listAnalyticsTags(opts: { enabled?: boolean } = {}): Promise<AnalyticsTag[]> {
        const { enabled } = opts;

        if (typeof enabled === 'boolean') {
            return db
                .select()
                .from(analyticsTag)
                .where(eq(analyticsTag.enabled, enabled))
                .orderBy(asc(analyticsTag.id));
        }

        return db.select().from(analyticsTag).orderBy(asc(analyticsTag.id));
    },

    async updateAnalyticsTag(
        id: number,
        patch: Partial<NewAnalyticsTag>
    ): Promise<AnalyticsTag | null> {
        const [row] = await db
            .update(analyticsTag)
            .set(patch)
            .where(eq(analyticsTag.id, id))
            .returning();
        return row ?? null;
    },

    async deleteAnalyticsTag(id: number): Promise<boolean> {
        const res = await db
            .delete(analyticsTag)
            .where(eq(analyticsTag.id, id))
            .returning({ id: analyticsTag.id });

        return res.length > 0;
    },

    async setAnalyticsTagScopes(
        id: number,
        scopes: string[]
    ): Promise<AnalyticsTag | null> {
        const [row] = await db
            .update(analyticsTag)
            .set({ injectScopes: scopes })
            .where(eq(analyticsTag.id, id))
            .returning();
        return row ?? null;
    },
};
