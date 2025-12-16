// src/services/unifiedAIService.ts
import { db } from '#db/db';
import { appUser } from '#db/schema/users';
import { order } from '#db/schema/orders';
import {and, desc, eq, inArray, lt, sql} from 'drizzle-orm';
import { deliveryStatusEnum } from '#db/schema/enums';
import {orderLog} from "#db/schema";

export interface ReferralAnalysis {
    totalUsers: number;
    activeReferrals: number;
    networkDepth: number;
    healthScore: number;
    recommendations: string[];
}

type AnalyzeOptions = {
    forceRefresh?: boolean;
    onlyActive?: boolean;
    countExternalHop?: boolean;
};

type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];

class TTLCache<T> {
    private store = new Map<string, { value: T; expireAt: number }>();
    get(key: string): T | null {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expireAt) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    set(key: string, value: T, ttlMinutes = 30) {
        const expireAt = Date.now() + ttlMinutes * 60_000;
        this.store.set(key, { value, expireAt });
    }
    del(key: string) { this.store.delete(key); }
}

export class UnifiedAIService {
    private cache = new TTLCache<ReferralAnalysis>();
    private cacheKey = 'referral_analysis_v1';

    invalidateReferralAnalysis() {
        this.cache.del(this.cacheKey);
    }

    async analyzeReferralSystem(opts: AnalyzeOptions = {}): Promise<ReferralAnalysis> {
        if (!opts.forceRefresh) {
            const cached = this.cache.get(this.cacheKey);
            if (cached) return cached;
        }

        type Row = Pick<
            typeof appUser.$inferSelect,
            'id' | 'telegramId' | 'appliedReferralCode' | 'createdAt' | 'isActive'
        >;

        const usersRaw = await db
            .select({
                id: appUser.id,
                telegramId: appUser.telegramId,
                appliedReferralCode: appUser.appliedReferralCode,
                createdAt: appUser.createdAt,
                isActive: appUser.isActive,
            })
            .from(appUser)
            .orderBy(desc(appUser.createdAt)) as Row[];

        const users = opts.onlyActive ? usersRaw.filter(u => u.isActive) : usersRaw;

        const analysis = this.calculateNetworkMetrics(users, {
            countExternalHop: opts.countExternalHop ?? true,
        });

        this.cache.set(this.cacheKey, analysis, 30);
        return analysis;
    }

    async getSystemPerformanceSummary(opts: AnalyzeOptions = {}) {
        const referralAnalysis = await this.analyzeReferralSystem(opts);
        // const bonusCheck = await this.validateBonusIntegrity();

        return {
            referrals: referralAnalysis,
            // bonuses: bonusCheck,
            timestamp: new Date().toISOString(),
            overallHealth: this.calculateOverallHealth(referralAnalysis /* , bonusCheck */),
        };
    }

    // ───────────────────────────────
    // ВНУТРЕННИЕ МЕТОДЫ
    // ───────────────────────────────

    private calculateNetworkMetrics(
        users: Array<{
            id: string;
            telegramId: string;
            appliedReferralCode: string | null;
            createdAt: Date | null;
            isActive: boolean | null;
        }>,
        opts: { countExternalHop: boolean },
    ): ReferralAnalysis {
        const byTelegram = new Map<string, (typeof users)[number]>();
        users.forEach(u => byTelegram.set(u.telegramId, u));

        let activeReferrals = 0;
        let maxDepth = 0;

        for (const u of users) {
            const inviter = u.appliedReferralCode ? byTelegram.get(u.appliedReferralCode) : undefined;
            if (inviter) activeReferrals++;

            const depth = this.depthFromUser(u, byTelegram, { countExternalHop: opts.countExternalHop });
            if (depth > maxDepth) maxDepth = depth;
        }

        const recommendations = this.generateRecommendations(users.length, activeReferrals, maxDepth);
        const healthScore = this.calculateHealthScore(users.length, activeReferrals, maxDepth);

        return {
            totalUsers: users.length,
            activeReferrals,
            networkDepth: maxDepth,
            healthScore,
            recommendations,
        };
    }

    private depthFromUser(
        user: { appliedReferralCode: string | null },
        byTelegram: Map<string, any>,
        opts: { countExternalHop: boolean },
        maxHops = 50,
    ): number {
        let hops = 0;
        let currentCode = user.appliedReferralCode;
        const visitedCodes = new Set<string>();

        while (currentCode) {
            if (visitedCodes.has(currentCode)) break;
            visitedCodes.add(currentCode);

            const inviter = byTelegram.get(currentCode);
            if (!inviter) {
                if (opts.countExternalHop) hops += 1;
                break;
            }

            hops += 1;
            currentCode = inviter.appliedReferralCode;
            if (hops >= maxHops) break;
        }
        return hops;
    }

    private generateRecommendations(totalUsers: number, activeReferrals: number, maxDepth: number): string[] {
        const rec: string[] = [];
        if (totalUsers === 0) return ['Система пуста — привлеките первых пользователей'];

        const referralRate = (activeReferrals / totalUsers) * 100;

        if (referralRate < 20) rec.push('Низкий процент приглашённых — усилите мотивацию (бонусы/акции/геймификация)');
        if (maxDepth < 2) rec.push('Неглубокая сеть — поработайте над удержанием и многошаговыми поощрениями');
        if (maxDepth > 5) rec.push('Сеть слишком глубокая — проверьте возможные злоупотребления/фермы');

        if (rec.length === 0) rec.push('Реферальная система работает сбалансированно');
        return rec;
    }

    private calculateHealthScore(totalUsers: number, activeReferrals: number, maxDepth: number): number {
        if (totalUsers === 0) return 0;

        let score = 50;

        const referralRate = (activeReferrals / totalUsers) * 100;
        if (referralRate > 30) score += 30;
        else if (referralRate > 15) score += 20;
        else if (referralRate > 5) score += 10;

        if (maxDepth >= 2 && maxDepth <= 4) score += 20;
        else if (maxDepth >= 1) score += 10;

        return Math.min(100, Math.max(0, score));
    }

    private calculateOverallHealth(referrals: ReferralAnalysis): string {
        const averageScore = referrals.healthScore;
        if (averageScore >= 80) return 'excellent';
        if (averageScore >= 60) return 'good';
        if (averageScore >= 40) return 'fair';
        return 'poor';
    }

    /**
     * Проверка целостности кэшбэков без отдельной таблицы userCashback.
     * Считаем «кандидатами» заказы с vwcCashback>0 старше N дней и без лог-события 'cashback_accrued'.
     * При необходимости поменяй текст события ниже на свой.
     */
    async validateBonusIntegrity(): Promise<{ valid: boolean; issues: string[]; fixedCount: number }> {
        const issues: string[] = [];
        let fixedCount = 0;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // кандидаты: заказы, где кэшбэк уже должен быть начислен — после доставки
        const candidates = await db
            .select({
                id: order.id,
                createdAt: order.createdAt,
                status: order.status,
                deliveryStatus: order.deliveryStatus,
                vwcCashback: order.vwcCashback,
            })
            .from(order)
            .where(and(
                // vwcCashback::numeric > 0
                sql`${order.vwcCashback}::numeric > 0`,
                // заказ старше 7 дней
                lt(order.createdAt, sevenDaysAgo),
                // считаем «готовыми к начислению» только доставленные
                eq(order.deliveryStatus, 'delivered' as DeliveryStatus),
            ))
            .orderBy(desc(order.createdAt))
            .limit(200);

        if (candidates.length === 0) {
            return { valid: true, issues, fixedCount };
        }

        const ids = candidates.map(c => c.id);

        // Ищем события начисления в логе
        const logs = await db
            .select({
                orderId: orderLog.orderId,
                event: orderLog.event,
            })
            .from(orderLog)
            .where(inArray(orderLog.orderId, ids));

        // считаем «зачтённым», если есть любое событие, содержащее "cashback"
        const hasAccrual = new Set(
            logs.filter(l => (l.event || '').toLowerCase().includes('cashback')).map(l => l.orderId)
        );

        const missing = candidates.filter(c => !hasAccrual.has(c.id));

        if (missing.length > 0) {
            issues.push(`${missing.length} заказ(ов) с кэшбэком > 0 старше 7 дней без события начисления в order_log`);
        }

        return { valid: issues.length === 0, issues, fixedCount };
    }
}

export const unifiedAIService = new UnifiedAIService();
