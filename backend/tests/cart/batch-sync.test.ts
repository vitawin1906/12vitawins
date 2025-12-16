// backend/tests/cart/batch-sync.test.ts
/**
 * ✅ FIX-5: Тест batch sync для корзины
 *
 * Проверяет, что POST /cart/sync:
 * 1. Синхронизирует несколько товаров одной транзакцией
 * 2. Пропускает несуществующие товары без ошибки
 * 3. Merge существующих items (увеличивает qty)
 * 4. Возвращает полную корзину после синхронизации
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { db } from '../../src/db/db';
import { appUser } from '../../src/db/schema/users';
import { product } from '../../src/db/schema/products';
import { order } from '../../src/db/schema/orders';
import { orderItem } from '../../src/db/schema/orderItem';
import { eq } from 'drizzle-orm';

describe('POST /api/cart/sync - Batch sync', () => {
    let authToken: string;
    let userId: string;
    let product1Id: string;
    let product2Id: string;
    let product3Id: string;

    beforeEach(async () => {
        // Очистка
        await db.delete(orderItem);
        await db.delete(order);
        await db.delete(product);
        await db.delete(appUser);

        // Создаём пользователя
        const [user] = await db
            .insert(appUser)
            .values({
                email: 'sync@test.com',
                telegramId: '123456',
                mlmStatus: 'partner',
            })
            .returning();
        userId = user.id;

        // Получаем токен (упрощённо — в реальности через login)
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sync@test.com', password: 'test123' });
        authToken = loginRes.body.token;

        // Создаём 3 товара
        const [p1, p2, p3] = await db
            .insert(product)
            .values([
                { name: 'Product 1', slug: 'product-1', price: '100', stock: 50 },
                { name: 'Product 2', slug: 'product-2', price: '200', stock: 30 },
                { name: 'Product 3', slug: 'product-3', price: '300', stock: 20 },
            ])
            .returning();

        product1Id = p1.id;
        product2Id = p2.id;
        product3Id = p3.id;
    });

    it('должен синхронизировать несколько товаров за один запрос', async () => {
        const res = await request(app)
            .post('/api/cart/sync')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { productId: product1Id, quantity: 2 },
                    { productId: product2Id, quantity: 3 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('Synced 2 items');
        expect(res.body.cart.items).toHaveLength(2);
        expect(res.body.cart.summary.quantity).toBe(5); // 2 + 3

        // Проверяем что товары в БД
        const [draftOrder] = await db
            .select()
            .from(order)
            .where(eq(order.userId, userId));

        const items = await db
            .select()
            .from(orderItem)
            .where(eq(orderItem.orderId, draftOrder.id));

        expect(items).toHaveLength(2);
    });

    it('должен пропускать несуществующие товары', async () => {
        const fakeProductId = '00000000-0000-0000-0000-000000000000';

        const res = await request(app)
            .post('/api/cart/sync')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { productId: product1Id, quantity: 1 },
                    { productId: fakeProductId, quantity: 5 }, // несуществующий
                    { productId: product2Id, quantity: 2 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Должны добавиться только 2 товара
        expect(res.body.cart.items).toHaveLength(2);
    });

    it('должен merge с существующими items в корзине', async () => {
        // Добавляем товар вручную
        await request(app)
            .post('/api/cart')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ action: 'add', product_id: product1Id, quantity: 1 });

        // Синхронизируем с тем же товаром
        const res = await request(app)
            .post('/api/cart/sync')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                items: [
                    { productId: product1Id, quantity: 2 }, // +2 к существующему 1
                    { productId: product2Id, quantity: 3 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.cart.items).toHaveLength(2);

        // Проверяем что qty увеличилось
        const item1 = res.body.cart.items.find((i: any) => i.productId === product1Id);
        expect(item1.qty).toBe(3); // 1 + 2
    });

    it('должен вернуть пустую корзину если items пустой', async () => {
        const res = await request(app)
            .post('/api/cart/sync')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ items: [] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('No items to sync');
        expect(res.body.cart.items).toHaveLength(0);
    });

    it('должен провалиться без авторизации', async () => {
        const res = await request(app)
            .post('/api/cart/sync')
            .send({
                items: [{ productId: product1Id, quantity: 1 }],
            });

        expect(res.status).toBe(401);
    });
});
