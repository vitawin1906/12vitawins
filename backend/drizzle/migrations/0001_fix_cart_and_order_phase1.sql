-- ✅ ФАЗА 1 (P0) МИГРАЦИЯ: Фиксы корзины и заказов
-- FIX-1: Stock не резервируется в cart (только проверка)
-- FIX-2: Referral discount 10% при создании заказа
-- FIX-3: recalcOrderTotals не перезаписывает finalized orders

-- ═══════════════════════════════════════════════════════════════
-- FIX-2: Добавить поля для referral discount в order
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS "referral_discount_rub" numeric(12,2) NOT NULL DEFAULT '0';

ALTER TABLE "order"
ADD COLUMN IF NOT EXISTS "referral_user_id" uuid REFERENCES app_user(id);

-- ═══════════════════════════════════════════════════════════════
-- FIX-2: CHECK constraint для referral discount
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "order"
ADD CONSTRAINT "chk_referral_discount_nonneg"
CHECK ("referral_discount_rub" >= 0);

-- ═══════════════════════════════════════════════════════════════
-- FIX-2: Индекс для быстрого поиска заказов по referrer
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS "ix_order_referral_user"
ON "order" ("referral_user_id");

-- ═══════════════════════════════════════════════════════════════
-- FIX-2: Unique constraint на order_item (один товар один раз)
-- ═══════════════════════════════════════════════════════════════

-- Сначала удаляем дубликаты, если они есть (оставляем только последний)
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, product_id
      ORDER BY created_at DESC
    ) as rn
  FROM order_item
)
DELETE FROM order_item
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Теперь создаём unique index
CREATE UNIQUE INDEX IF NOT EXISTS "uq_order_item_order_product"
ON "order_item" ("order_id", "product_id");

-- ═══════════════════════════════════════════════════════════════
-- Комментарии для документации
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN "order"."referral_discount_rub" IS
'FIX-2: Referral discount 10% от subtotal (max 1000 RUB)';

COMMENT ON COLUMN "order"."referral_user_id" IS
'FIX-2: ID реферера, который дал скидку 10%';

COMMENT ON INDEX "uq_order_item_order_product" IS
'FIX-2: Предотвращает дублирование товаров в одном заказе';
