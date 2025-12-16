// backend/src/storage/promoCodesStorage.ts
import { db } from '#db/db';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { promoCode, promoCodeUsage, type PromoCode, type NewPromoCode, type PromoCodeUsage as PromoCodeUsageType, type NewPromoCodeUsage } from '#db/schema/promoCodes';

/**
 * ✅ C-2: Promo Codes Storage Layer
 *
 * Централизованный storage с atomic operations для промокодов.
 * Решает проблемы race conditions и двойного использования onePerUser.
 */

export const promoCodesStorage = {
    /* ───────────────── Promo Code CRUD ───────────────── */

    /**
     * Создать промокод
     */
    async create(data: NewPromoCode): Promise<PromoCode> {
        const rows = await db
            .insert(promoCode)
            .values(data)
            .returning();

        const code = rows[0];
        if (!code) {
            throw new Error("Failed to create promo code");
        }

        return code;
    },

    /**
     * Получить промокод по ID
     */
    async getById(id: string): Promise<PromoCode | null> {
        const [code] = await db
            .select()
            .from(promoCode)
            .where(eq(promoCode.id, id))
            .limit(1);
        return code ?? null;
    },

    /**
     * Получить промокод по коду
     */
    async getByCode(code: string): Promise<PromoCode | null> {
        const [promo] = await db
            .select()
            .from(promoCode)
            .where(eq(promoCode.code, code))
            .limit(1);
        return promo ?? null;
    },

    /**
     * Обновить промокод
     */
    async update(id: string, data: Partial<PromoCode>): Promise<PromoCode | null> {
        const [updated] = await db
            .update(promoCode)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(promoCode.id, id))
            .returning();
        return updated ?? null;
    },

    /**
     * Удалить промокод
     */
    async delete(id: string): Promise<boolean> {
        const result = await db
            .delete(promoCode)
            .where(eq(promoCode.id, id));
        return result.rowCount! > 0;
    },

    /**
     * Список промокодов с фильтрами
     */
    async list(params: {
        active?: boolean;
        limit?: number;
        offset?: number;
    } = {}): Promise<PromoCode[]> {
        const { active, limit = 50, offset = 0 } = params;

        const whereClause =
            active !== undefined ? eq(promoCode.isActive, active) : undefined;

        const rows = await db
            .select()
            .from(promoCode)
            .where(whereClause ?? sql`true`)
            .orderBy(desc(promoCode.createdAt))
            .limit(limit)
            .offset(offset);

        return rows;
    },


    /* ───────────────── Atomic Operations ───────────────── */

    /**
     * ✅ Atomic: Инкремент использования промокода с проверкой лимита
     * Предотвращает race conditions при одновременных заказах
     *
     * @returns true если инкремент успешен, false если лимит исчерпан
     */
    async incrementUsageAtomic(codeId: string): Promise<boolean> {
        const result = await db.execute(sql`
            UPDATE ${promoCode}
            SET
                current_uses = current_uses + 1,
                updated_at = NOW()
            WHERE
                ${promoCode.id} = ${codeId}
                AND (
                    ${promoCode.maxUses} IS NULL
                    OR ${promoCode.currentUses} < ${promoCode.maxUses}
                )
            RETURNING id
        `);

        return result.rowCount! > 0;
    },

    /**
     * ✅ Atomic: Декремент использования промокода (откат)
     * Используется при отмене заказа
     */
    async decrementUsageAtomic(codeId: string): Promise<void> {
        await db.execute(sql`
            UPDATE ${promoCode}
            SET
                current_uses = GREATEST(0, current_uses - 1),
                updated_at = NOW()
            WHERE ${promoCode.id} = ${codeId}
        `);
    },

    /**
     * Проверить валидность промокода
     * Не изменяет состояние, только проверяет
     */
    async validate(code: string, userId: string, orderSubtotalRub: number): Promise<{
        valid: boolean;
        promoCode?: PromoCode;
        error?: string;
    }> {
        const promo = await this.getByCode(code);

        if (!promo) {
            return { valid: false, error: 'Promo code not found' };
        }

        if (!promo.isActive) {
            return { valid: false, error: 'Promo code is inactive' };
        }

        // Проверка истечения срока
        if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
            return { valid: false, error: 'Promo code expired' };
        }

        // Проверка лимита использования
        if (promo.maxUses && promo.currentUses >= promo.maxUses) {
            return { valid: false, error: 'Promo code usage limit reached' };
        }

        // Проверка минимальной суммы заказа
        if (promo.minOrderRub && orderSubtotalRub < Number(promo.minOrderRub)) {
            return {
                valid: false,
                error: `Minimum order amount is ${promo.minOrderRub} RUB`,
            };
        }

        // Проверка onePerUser
        if (promo.onePerUser) {
            const alreadyUsed = await this.hasUserUsedCode(userId, promo.id);
            if (alreadyUsed) {
                return { valid: false, error: 'You have already used this promo code' };
            }
        }

        return { valid: true, promoCode: promo };
    },

    /* ───────────────── Promo Code Usage ───────────────── */

    /**
     * ✅ Проверить, использовал ли пользователь промокод (onePerUser constraint)
     */
    async hasUserUsedCode(userId: string, codeId: string): Promise<boolean> {
        const [usage] = await db
            .select()
            .from(promoCodeUsage)
            .where(
                and(
                    eq(promoCodeUsage.userId, userId),
                    eq(promoCodeUsage.promoCodeId, codeId)
                )
            )
            .limit(1);

        return !!usage;
    },

    /**
     * ✅ Transaction-safe: Применить промокод к заказу
     * Atomic operation: increment usage + create usage record
     */
    async applyPromoCode(data: {
        userId: string;
        orderId: string;
        promoCodeId: string;
        discountRub: string;
    }): Promise<PromoCodeUsageType> {
        return await db.transaction(async (tx) => {
            // 1. Atomic increment с проверкой лимита
            const incrementSuccess = await this.incrementUsageAtomic(data.promoCodeId);

            if (!incrementSuccess) {
                throw new Error('Promo code usage limit reached or not found');
            }

            // 2. Создать запись использования
            const inserted = await tx
                .insert(promoCodeUsage)
                .values({
                    userId: data.userId,
                    orderId: data.orderId,
                    promoCodeId: data.promoCodeId,
                    discountRub: data.discountRub,
                })
                .returning();

            const usage = inserted[0];

            if (!usage) {
                throw new Error('Failed to create promo code usage record');
            }

            return usage;
        });
    },

    /**
     * ✅ Transaction-safe: Отменить использование промокода
     * При отмене заказа
     */
    async cancelPromoCodeUsage(orderId: string): Promise<void> {
        await db.transaction(async (tx) => {
            // 1. Найти usage record
            const [usage] = await tx
                .select()
                .from(promoCodeUsage)
                .where(eq(promoCodeUsage.orderId, orderId))
                .limit(1);

            if (!usage) return; // Промокод не использовался

            // 2. Atomic decrement
            await this.decrementUsageAtomic(usage.promoCodeId);

            // 3. Удалить usage record
            await tx
                .delete(promoCodeUsage)
                .where(eq(promoCodeUsage.orderId, orderId));
        });
    },

    /**
     * Получить использование промокода для заказа
     */
    async getUsageByOrderId(orderId: string): Promise<PromoCodeUsageType | null> {
        const [usage] = await db
            .select()
            .from(promoCodeUsage)
            .where(eq(promoCodeUsage.orderId, orderId))
            .limit(1);
        return usage ?? null;
    },

    /**
     * История использования промокода пользователем
     */
    async getUserUsageHistory(userId: string): Promise<(PromoCodeUsageType & { code: string })[]> {
        const result = await db
            .select({
                id: promoCodeUsage.id,
                userId: promoCodeUsage.userId,
                createdAt: promoCodeUsage.createdAt,
                orderId: promoCodeUsage.orderId,
                promoCodeId: promoCodeUsage.promoCodeId,
                discountRub: promoCodeUsage.discountRub,
                code: promoCode.code,
            })
            .from(promoCodeUsage)
            .leftJoin(promoCode, eq(promoCodeUsage.promoCodeId, promoCode.id))
            .where(eq(promoCodeUsage.userId, userId))
            .orderBy(desc(promoCodeUsage.createdAt));

        return result as (PromoCodeUsageType & { code: string })[];
    },

    /**
     * Статистика использования промокода
     */
    async getCodeStats(codeId: string): Promise<{
        totalUses: number;
        totalDiscount: string;
        uniqueUsers: number;
    }> {
        const result = await db.execute(sql`
            SELECT
                COUNT(*)::int as total_uses,
                COALESCE(SUM(discount_rub::numeric), 0) as total_discount,
                COUNT(DISTINCT user_id)::int as unique_users
            FROM ${promoCodeUsage}
            WHERE promo_code_id = ${codeId}
        `);

        const row = result.rows[0] as any;

        return {
            totalUses: row.total_uses ?? 0,
            totalDiscount: String(row.total_discount ?? 0),
            uniqueUsers: row.unique_users ?? 0,
        };
    },
};

export default promoCodesStorage;
