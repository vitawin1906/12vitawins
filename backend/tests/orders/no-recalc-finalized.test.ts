// ✅ FIX-3: TEST - recalcOrderTotals НЕ перезаписывает finalized orders
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/db';
import { order } from '../../src/db/schema/orders';
import { orderItemStorage } from '../../src/storage/orderItemStorage';
import { eq } from 'drizzle-orm';

describe('FIX-3: Recalc Order Totals Protection', () => {
  let testOrderId: string;
  let testProductId: string;

  beforeEach(async () => {
    // Setup test order and product
    // ...
  });

  it('should recalc totals for pending orders', async () => {
    // Create pending order (status='pending')
    const [pendingOrder] = await db.insert(order).values({
      userId: 'test-user-id',
      status: 'pending',
      orderBaseRub: '1000',
      pvEarned: 5,
    }).returning();

    // Add item to cart (should trigger recalcOrderTotals)
    await orderItemStorage.addItem(pendingOrder.id, testProductId, 2);

    // ✅ Totals should be recalculated
    const [updated] = await db
      .select()
      .from(order)
      .where(eq(order.id, pendingOrder.id))
      .limit(1);

    expect(Number(updated.orderBaseRub)).not.toBe(1000); // Changed
    expect(updated.pvEarned).not.toBe(5); // Changed
  });

  it('should NOT recalc totals for finalized orders (status != pending)', async () => {
    // Create finalized order (status='new')
    const [finalizedOrder] = await db.insert(order).values({
      userId: 'test-user-id',
      status: 'new', // ← Finalized
      orderBaseRub: '5000',
      pvEarned: 25,
      referralDiscountRub: '500',
      referralUserId: 'test-referrer-id',
    }).returning();

    // Try to add item (should NOT trigger recalc)
    await orderItemStorage.addItem(finalizedOrder.id, testProductId, 1)
      .catch(() => {}); // May fail, but that's ok

    // ✅ Totals should remain unchanged
    const [unchanged] = await db
      .select()
      .from(order)
      .where(eq(order.id, finalizedOrder.id))
      .limit(1);

    expect(Number(unchanged.orderBaseRub)).toBe(5000); // NOT changed
    expect(unchanged.pvEarned).toBe(25); // NOT changed
    expect(Number(unchanged.referralDiscountRub)).toBe(500); // NOT changed
  });

  it('should protect orderBase from being overwritten after createOrder', async () => {
    // Simulate createOrder flow:
    // 1. Create draft order (pending)
    const [draft] = await db.insert(order).values({
      userId: 'test-user-id',
      status: 'pending',
      orderBaseRub: '0',
    }).returning();

    // 2. Add items
    await orderItemStorage.addItem(draft.id, testProductId, 2);

    // 3. Finalize order (status='new') with correct orderBase
    const [finalized] = await db
      .update(order)
      .set({
        status: 'new',
        orderBaseRub: '4500', // Correct value with discounts
        referralDiscountRub: '500',
        pvEarned: 22,
      })
      .where(eq(order.id, draft.id))
      .returning();

    expect(Number(finalized.orderBaseRub)).toBe(4500);

    // 4. Try to modify cart (should NOT recalc)
    await orderItemStorage.addItem(finalized.id, testProductId, 1)
      .catch(() => {});

    // ✅ orderBase should still be 4500 (NOT recalculated)
    const [protected] = await db
      .select()
      .from(order)
      .where(eq(order.id, finalized.id))
      .limit(1);

    expect(Number(protected.orderBaseRub)).toBe(4500);
    expect(protected.pvEarned).toBe(22);
  });
});
