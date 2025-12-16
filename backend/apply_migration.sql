-- Прямое применение миграции к БД
-- Дата: 2025-12-10

-- Проверка существования колонок
DO $$
BEGIN
    -- Добавляем referral_discount_rub если не существует
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order' AND column_name = 'referral_discount_rub'
    ) THEN
        ALTER TABLE "order"
        ADD COLUMN "referral_discount_rub" numeric(12,2) NOT NULL DEFAULT '0';

        RAISE NOTICE 'Added column referral_discount_rub';
    ELSE
        RAISE NOTICE 'Column referral_discount_rub already exists';
    END IF;

    -- Добавляем referral_user_id если не существует
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order' AND column_name = 'referral_user_id'
    ) THEN
        ALTER TABLE "order"
        ADD COLUMN "referral_user_id" uuid REFERENCES app_user(id);

        RAISE NOTICE 'Added column referral_user_id';
    ELSE
        RAISE NOTICE 'Column referral_user_id already exists';
    END IF;
END $$;

-- Добавляем CHECK constraint если не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_referral_discount_nonneg'
    ) THEN
        ALTER TABLE "order"
        ADD CONSTRAINT "chk_referral_discount_nonneg"
        CHECK ("referral_discount_rub" >= 0);

        RAISE NOTICE 'Added constraint chk_referral_discount_nonneg';
    ELSE
        RAISE NOTICE 'Constraint chk_referral_discount_nonneg already exists';
    END IF;
END $$;

-- Создаём индекс если не существует
CREATE INDEX IF NOT EXISTS "ix_order_referral_user"
ON "order" ("referral_user_id");

-- Удаляем дубликаты в order_item (если есть)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY order_id, product_id
        ORDER BY created_at DESC
    ) as rn
    FROM order_item
)
DELETE FROM order_item
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Создаём unique index на order_item
CREATE UNIQUE INDEX IF NOT EXISTS "uq_order_item_order_product"
ON "order_item" ("order_id", "product_id");

-- Проверяем результат
SELECT
    'order' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order'
AND column_name IN ('referral_discount_rub', 'referral_user_id')
ORDER BY column_name;
