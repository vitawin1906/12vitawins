// ✅ FIX-2: TEST - Referral discount 10% применяется при createOrder
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { db } from '../../src/db/db';
import { appUser } from '../../src/db/schema/users';
import { product } from '../../src/db/schema/products';
import { order } from '../../src/db/schema/orders';
import { eq } from 'drizzle-orm';

describe('FIX-2: Referral Discount', () => {
  let referrerId: string;
  let userToken: string;
  let testProductId: string;

  beforeEach(async () => {
    // Setup: Create referrer with telegram_id=123456
    const [referrer] = await db.insert(appUser).values({
      telegramId: '123456',
      referralCode: '123456',
      mlmStatus: 'partner',
    }).returning();
    referrerId = referrer.id;

    // Setup: Create test product
    const [prod] = await db.insert(product).values({
      name: 'Test Product',
      price: '5000', // 5000 RUB
      stock: 100,
      isActive: true,
    }).returning();
    testProductId = prod.id;

    // Setup: Create test user and get token
    // ... (auth setup)
  });

  it('should apply 10% referral discount (subtotal 5000 → 500 RUB discount)', async () => {
    // Add product to cart
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        action: 'add',
        product_id: testProductId,
        quantity: 1, // 1 × 5000 = 5000 subtotal
      });

    // Create order with referral code (Telegram ID)
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: 'card',
        promoCode: '123456', // Referrer's Telegram ID
        deliveryAddress: 'Test Address 123',
        idempotencyKey: crypto.randomUUID(),
      })
      .expect(201);

    const orderId = res.body.order.id;

    // ✅ Check order in DB
    const [ord] = await db
      .select()
      .from(order)
      .where(eq(order.id, orderId))
      .limit(1);

    // referralDiscountRub should be 500 (10% of 5000)
    expect(Number(ord.referralDiscountRub)).toBe(500);
    expect(ord.referralUserId).toBe(referrerId);

    // orderBase should be 4500 (5000 - 500)
    expect(Number(ord.orderBaseRub)).toBe(4500);

    // PV should be calculated from orderBase: floor(4500 / 200) = 22
    expect(ord.pvEarned).toBe(22);
  });

  it('should cap referral discount at 1000 RUB', async () => {
    // Create expensive product
    const [expensiveProd] = await db.insert(product).values({
      name: 'Expensive Product',
      price: '15000', // 15000 RUB
      stock: 100,
      isActive: true,
    }).returning();

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        action: 'add',
        product_id: expensiveProd.id,
        quantity: 1,
      });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: 'card',
        promoCode: '123456',
        deliveryAddress: 'Test Address',
        idempotencyKey: crypto.randomUUID(),
      })
      .expect(201);

    const [ord] = await db
      .select()
      .from(order)
      .where(eq(order.id, res.body.order.id))
      .limit(1);

    // ✅ 10% of 15000 = 1500, but capped at 1000
    expect(Number(ord.referralDiscountRub)).toBe(1000);
    expect(Number(ord.orderBaseRub)).toBe(14000); // 15000 - 1000
  });

  it('should NOT apply referral discount if code is invalid', async () => {
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        action: 'add',
        product_id: testProductId,
        quantity: 1,
      });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: 'card',
        promoCode: '999999', // Non-existent Telegram ID
        deliveryAddress: 'Test Address',
        idempotencyKey: crypto.randomUUID(),
      })
      .expect(201);

    const [ord] = await db
      .select()
      .from(order)
      .where(eq(order.id, res.body.order.id))
      .limit(1);

    // ✅ No referral discount
    expect(Number(ord.referralDiscountRub)).toBe(0);
    expect(ord.referralUserId).toBeNull();
    expect(Number(ord.orderBaseRub)).toBe(5000); // Full price
  });
});
