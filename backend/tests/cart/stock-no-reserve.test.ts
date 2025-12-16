// ✅ FIX-1: TEST - Stock НЕ резервируется при добавлении в cart
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { db } from '../../src/db/db';
import { product } from '../../src/db/schema/products';
import { eq } from 'drizzle-orm';

describe('FIX-1: Cart Stock Reservation', () => {
  let testProductId: string;
  let userToken: string;

  beforeEach(async () => {
    // Setup: Create test product with stock=10
    const [prod] = await db.insert(product).values({
      name: 'Test Product',
      price: '1000',
      stock: 10,
      isActive: true,
    }).returning();
    testProductId = prod.id;

    // Setup: Create test user and get token
    // ... (auth setup)
  });

  it('should NOT decrease stock when adding to cart', async () => {
    // Get initial stock
    let [prod] = await db
      .select({ stock: product.stock })
      .from(product)
      .where(eq(product.id, testProductId))
      .limit(1);

    expect(prod.stock).toBe(10);

    // Add to cart (qty=5)
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        action: 'add',
        product_id: testProductId,
        quantity: 5,
      })
      .expect(200);

    // ✅ Stock should STILL be 10 (not reserved)
    [prod] = await db
      .select({ stock: product.stock })
      .from(product)
      .where(eq(product.id, testProductId))
      .limit(1);

    expect(prod.stock).toBe(10); // NOT 5!
  });

  it('should decrease stock ONLY when creating order', async () => {
    // Add to cart
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        action: 'add',
        product_id: testProductId,
        quantity: 5,
      });

    // Stock still 10
    let [prod] = await db
      .select({ stock: product.stock })
      .from(product)
      .where(eq(product.id, testProductId))
      .limit(1);
    expect(prod.stock).toBe(10);

    // Create order
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: 'card',
        deliveryAddress: 'Test Address 123',
        idempotencyKey: crypto.randomUUID(),
      })
      .expect(201);

    // ✅ NOW stock should be 5 (10 - 5)
    [prod] = await db
      .select({ stock: product.stock })
      .from(product)
      .where(eq(product.id, testProductId))
      .limit(1);

    expect(prod.stock).toBe(5);
  });

  it('should check stock availability WITHOUT reserving', async () => {
    // Try to add more than available
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        action: 'add',
        product_id: testProductId,
        quantity: 15, // More than stock=10
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');

    // Stock should still be 10 (nothing reserved)
    const [prod] = await db
      .select({ stock: product.stock })
      .from(product)
      .where(eq(product.id, testProductId))
      .limit(1);

    expect(prod.stock).toBe(10);
  });
});
