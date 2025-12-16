// backend/tests/orders/customer-no-cashback.test.ts
/**
 * ✅ FIX-4: Тест блокировки VWC кэшбека для customer
 *
 * Проверяет, что customer (без canReceiveFirstlineBonus) не получает VWC кэшбек:
 * 1. customer создаёт заказ
 * 2. Заказ помечается как delivered
 * 3. VWC кэшбек НЕ начисляется (wallet balance не меняется)
 * 4. partner получает кэшбек (для сравнения)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { appUser } from '../../src/db/schema/users';
import { product } from '../../src/db/schema/products';
import { order } from '../../src/db/schema/orders';
import { orderItem } from '../../src/db/schema/orderItem';
import { ledgerService } from '../../src/services/ledgerService';
import { usersStorage } from '../../src/storage/usersStorage';
import ordersStorage from '../../src/storage/ordersStorage';
import { eq } from 'drizzle-orm';

describe('FIX-4: customer НЕ получает VWC cashback', () => {
    let customerId: string;
    let partnerId: string;
    let productId: string;

    beforeEach(async () => {
        // Очистка
        await db.delete(orderItem);
        await db.delete(order);
        await db.delete(product);
        await db.delete(appUser);

        // Создаём customer (БЕЗ canReceiveFirstlineBonus)
        const [customer] = await db
            .insert(appUser)
            .values({
                email: 'customer@test.com',
                telegramId: '111',
                mlmStatus: 'customer',
                canReceiveFirstlineBonus: false,
            })
            .returning();
        customerId = customer.id;

        // Создаём partner (для сравнения)
        const [partner] = await db
            .insert(appUser)
            .values({
                email: 'partner@test.com',
                telegramId: '222',
                mlmStatus: 'partner',
            })
            .returning();
        partnerId = partner.id;

        // Создаём товар
        const [prod] = await db
            .insert(product)
            .values({ name: 'Product', slug: 'product', price: '1000', stock: 100 })
            .returning();
        productId = prod.id;
    });

    it('customer НЕ должен получить VWC кэшбек', async () => {
        // Создаём заказ от customer
        const draftOrder = await ordersStorage.findOrCreateDraftOrder(customerId);

        await db.insert(orderItem).values({
            orderId: draftOrder.id,
            productId,
            productName: 'Product',
            qty: 1,
            unitPriceRub: '1000',
            lineSubtotalRub: '1000',
            lineTotalRub: '1000',
            pvEach: 5,
            pvTotal: 5,
        });

        await ordersStorage.update(draftOrder.id, {
            status: 'paid',
            orderBaseRub: '1000',
            totalPayableRub: '1000',
        });

        // Проверяем баланс VWC ДО обработки
        const userBefore = await usersStorage.getUserById(customerId);
        const vwcBalanceBefore = Number(userBefore?.walletVwc ?? 0);

        // Обрабатываем заказ (доставлен)
        await ledgerService.processOrderPayment(draftOrder.id);

        // Проверяем баланс VWC ПОСЛЕ обработки
        const userAfter = await usersStorage.getUserById(customerId);
        const vwcBalanceAfter = Number(userAfter?.walletVwc ?? 0);

        // ✅ VWC НЕ должен измениться для customer
        expect(vwcBalanceAfter).toBe(vwcBalanceBefore);
    });

    it('partner ДОЛЖЕН получить VWC кэшбек', async () => {
        // Создаём заказ от partner
        const draftOrder = await ordersStorage.findOrCreateDraftOrder(partnerId);

        await db.insert(orderItem).values({
            orderId: draftOrder.id,
            productId,
            productName: 'Product',
            qty: 1,
            unitPriceRub: '1000',
            lineSubtotalRub: '1000',
            lineTotalRub: '1000',
            pvEach: 5,
            pvTotal: 5,
        });

        await ordersStorage.update(draftOrder.id, {
            status: 'paid',
            orderBaseRub: '1000',
            totalPayableRub: '1000',
        });

        // Проверяем баланс VWC ДО обработки
        const userBefore = await usersStorage.getUserById(partnerId);
        const vwcBalanceBefore = Number(userBefore?.walletVwc ?? 0);

        // Обрабатываем заказ (доставлен)
        await ledgerService.processOrderPayment(draftOrder.id);

        // Проверяем баланс VWC ПОСЛЕ обработки
        const userAfter = await usersStorage.getUserById(partnerId);
        const vwcBalanceAfter = Number(userAfter?.walletVwc ?? 0);

        // ✅ VWC ДОЛЖЕН увеличиться для partner (5% от 1000 = 50 VWC)
        expect(vwcBalanceAfter).toBe(vwcBalanceBefore + 50);
    });

    it('customer С canReceiveFirstlineBonus ДОЛЖЕН получить кэшбек', async () => {
        // Обновляем customer: устанавливаем canReceiveFirstlineBonus
        await db
            .update(appUser)
            .set({ canReceiveFirstlineBonus: true })
            .where(eq(appUser.id, customerId));

        // Создаём заказ от customer
        const draftOrder = await ordersStorage.findOrCreateDraftOrder(customerId);

        await db.insert(orderItem).values({
            orderId: draftOrder.id,
            productId,
            productName: 'Product',
            qty: 1,
            unitPriceRub: '1000',
            lineSubtotalRub: '1000',
            lineTotalRub: '1000',
            pvEach: 5,
            pvTotal: 5,
        });

        await ordersStorage.update(draftOrder.id, {
            status: 'paid',
            orderBaseRub: '1000',
            totalPayableRub: '1000',
        });

        // Проверяем баланс VWC ДО обработки
        const userBefore = await usersStorage.getUserById(customerId);
        const vwcBalanceBefore = Number(userBefore?.walletVwc ?? 0);

        // Обрабатываем заказ (доставлен)
        await ledgerService.processOrderPayment(draftOrder.id);

        // Проверяем баланс VWC ПОСЛЕ обработки
        const userAfter = await usersStorage.getUserById(customerId);
        const vwcBalanceAfter = Number(userAfter?.walletVwc ?? 0);

        // ✅ VWC ДОЛЖЕН увеличиться (5% от 1000 = 50 VWC)
        expect(vwcBalanceAfter).toBe(vwcBalanceBefore + 50);
    });
});
