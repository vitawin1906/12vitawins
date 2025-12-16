-- Migration: Add bonuses_granted_rub to order table
-- Registry.md ЭТАП 2.3: Хранение суммы ВСЕХ начисленных бонусов (L1-L15 + Fast Start + Infinity)

ALTER TABLE "order"
ADD COLUMN "bonuses_granted_rub" NUMERIC(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN "order"."bonuses_granted_rub" IS 'Total sum of all referral bonuses granted (L1-L15 + Fast Start + Infinity) for this order';
