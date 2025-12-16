// backend/src/services/promoCodeService.ts
import { db } from '#db/db';
import { promoCode, promoCodeUsage } from '#db/schema/promoCodes';
import { eq, and, sql, lt, gt, isNull, or } from 'drizzle-orm';
import { AppError, AppErrorCode } from '../middleware/errorHandler';

export interface ValidatePromoCodeParams {
    code: string;
    userId: string;
    orderSubtotalRub: number;
}

export interface PromoCodeDiscount {
    promoCodeId: string;
    code: string;
    discountRub: number;
    type: 'percent_off' | 'fixed_amount';
}

export const promoCodeService = {
    /**
     * Валидировать промокод и вычислить скидку
     * Проверяет: существование, активность, срок действия, лимиты использования
     */
    async validateAndCalculate(params: ValidatePromoCodeParams): Promise<PromoCodeDiscount> {
        const { code, userId, orderSubtotalRub } = params;

        // 1. Найти промокод
        const [promo] = await db
            .select()
            .from(promoCode)
            .where(eq(promoCode.code, code.toUpperCase()))
            .limit(1);

        if (!promo) {
            throw new AppError(AppErrorCode.NOT_FOUND, `Промокод "${code}" не найден`, 404);
        }

        // 2. Проверка активности
        if (!promo.isActive) {
            throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Промокод неактивен', 400);
        }

        // 3. Проверка срока действия
        const now = new Date();
        if (promo.startsAt && promo.startsAt > now) {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                `Промокод станет доступен с ${promo.startsAt.toLocaleDateString()}`,
                400
            );
        }
        if (promo.expiresAt && promo.expiresAt < now) {
            throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Срок действия промокода истёк', 400);
        }

        // 4. Проверка общего лимита использования
        if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
            throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Промокод исчерпан', 400);
        }

        // 5. Проверка onePerUser: пользователь уже использовал этот промокод?
        if (promo.onePerUser) {
            const [existingUsage] = await db
                .select()
                .from(promoCodeUsage)
                .where(
                    and(
                        eq(promoCodeUsage.promoCodeId, promo.id),
                        eq(promoCodeUsage.userId, userId)
                    )
                )
                .limit(1);

            if (existingUsage) {
                throw new AppError(
                    AppErrorCode.VALIDATION_ERROR,
                    'Вы уже использовали этот промокод',
                    400
                );
            }
        }

        // 6. Проверка минимальной суммы заказа
        const minOrder = Number(promo.minOrderRub ?? 0);
        if (orderSubtotalRub < minOrder) {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                `Минимальная сумма заказа для применения промокода: ${minOrder} RUB`,
                400
            );
        }

        // 7. Вычисление скидки
        let discountRub = 0;
        if (promo.type === 'percent_off') {
            const percent = Number(promo.percentOff ?? 0);
            discountRub = (orderSubtotalRub * percent) / 100;
        } else if (promo.type === 'fixed_amount') {
            discountRub = Number(promo.fixedAmountRub ?? 0);
        }

        // Скидка не может превышать стоимость заказа
        discountRub = Math.min(discountRub, orderSubtotalRub);
        discountRub = Math.max(discountRub, 0);

        return {
            promoCodeId: promo.id,
            code: promo.code,
            discountRub: Math.round(discountRub * 100) / 100, // округление до 2 знаков
            type: promo.type as 'percent_off' | 'fixed_amount',
        };
    },

    /**
     * Применить промокод: увеличить счётчик использований и записать в историю
     * ВАЖНО: вызывать внутри транзакции заказа!
     */
    async applyPromoCode(params: {
        promoCodeId: string;
        userId: string;
        orderId: string;
        discountRub: number;
    }): Promise<void> {
        const { promoCodeId, userId, orderId, discountRub } = params;

        // 1. Инкрементируем currentUses
        await db
            .update(promoCode)
            .set({
                currentUses: sql`${promoCode.currentUses} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(promoCode.id, promoCodeId));

        // 2. Записываем использование в историю
        await db.insert(promoCodeUsage).values({
            promoCodeId,
            userId,
            orderId,
            discountRub: String(discountRub),
        });
    },

    /**
     * Отменить применение промокода (при отмене заказа)
     * Уменьшает счётчик использований и удаляет запись из истории
     */
    async cancelPromoCodeUsage(orderId: string): Promise<void> {
        // Найти использованный промокод
        const [usage] = await db
            .select()
            .from(promoCodeUsage)
            .where(eq(promoCodeUsage.orderId, orderId))
            .limit(1);

        if (!usage) return; // Промокод не использовался

        // Декрементируем currentUses
        await db
            .update(promoCode)
            .set({
                currentUses: sql`GREATEST(0, ${promoCode.currentUses} - 1)`,
                updatedAt: new Date(),
            })
            .where(eq(promoCode.id, usage.promoCodeId));

        // Удаляем запись из истории
        await db.delete(promoCodeUsage).where(eq(promoCodeUsage.orderId, orderId));
    },
};
