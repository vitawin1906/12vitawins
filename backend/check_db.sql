-- Проверка существования колонок
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'order'
AND column_name IN ('referral_discount_rub', 'referral_user_id')
ORDER BY column_name;
