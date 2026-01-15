-- Migration: Add missing order columns
-- Adds: bonuses_granted_rub, referral_discount_rub, referral_user_id

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "bonuses_granted_rub" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "referral_discount_rub" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "referral_user_id" UUID;

COMMENT ON COLUMN "order"."bonuses_granted_rub" IS 'Total sum of all referral bonuses granted (L1-L15 + Fast Start + Infinity) for this order';
COMMENT ON COLUMN "order"."referral_discount_rub" IS 'Referral discount amount applied to the order';
COMMENT ON COLUMN "order"."referral_user_id" IS 'User ID who referred this order (for referral tracking)';
