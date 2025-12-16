CREATE TYPE "public"."account_type" AS ENUM('cash_rub', 'pv', 'vwc', 'referral', 'reserve_special', 'network_fund');--> statement-breakpoint
CREATE TYPE "public"."address_type" AS ENUM('home', 'work');--> statement-breakpoint
CREATE TYPE "public"."airdrop_check_type" AS ENUM('tg_channel_sub', 'custom');--> statement-breakpoint
CREATE TYPE "public"."airdrop_trigger" AS ENUM('tg_channel_sub', 'custom');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('published', 'draft');--> statement-breakpoint
CREATE TYPE "public"."category_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('RUB', 'VWC', 'PV');--> statement-breakpoint
CREATE TYPE "public"."delivery_service" AS ENUM('sdek', 'russianpost', 'yandex');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('not_required', 'pending', 'in_transit', 'delivered', 'lost', 'returned');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('line_item', 'cart_fixed', 'cart_percent', 'referral_10');--> statement-breakpoint
CREATE TYPE "public"."fast_start_point" AS ENUM('registration', 'first_paid', 'activation');--> statement-breakpoint
CREATE TYPE "public"."ledger_op_type" AS ENUM('order_accrual', 'order_payment', 'refund', 'reward', 'transfer', 'fast_start', 'infinity', 'option_bonus', 'activation_bonus', 'first_pool', 'airdrop', 'achievement', 'adjustment', 'withdrawal_request', 'withdrawal_payout', 'cashback', 'network_bonus', 'referral_bonus', 'network_fund_allocation');--> statement-breakpoint
CREATE TYPE "public"."mlm_rank" AS ENUM('member', 'лидер', 'создатель');--> statement-breakpoint
CREATE TYPE "public"."mlm_status" AS ENUM('customer', 'partner', 'partner_pro');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'telegram', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_event" AS ENUM('order_created', 'order_paid', 'order_shipped', 'withdrawal_requested', 'withdrawal_approved', 'airdrop_completed');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('new', 'pending', 'paid', 'shipped', 'delivered', 'canceled', 'returned_partial', 'returned_full');--> statement-breakpoint
CREATE TYPE "public"."owner_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'sbp', 'wallet', 'cash', 'promo');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('init', 'awaiting', 'authorized', 'captured', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."rbac_role" AS ENUM('admin', 'finance', 'support', 'editor');--> statement-breakpoint
CREATE TYPE "public"."ui_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('requested', 'in_review', 'approved', 'rejected', 'paid', 'canceled');--> statement-breakpoint
CREATE TABLE "achievement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"reward_vwc" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activation_package" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_activation_package_type" CHECK ("activation_package"."type" IN ('partner', 'partner_pro')),
	CONSTRAINT "chk_activation_package_amount" CHECK ("activation_package"."amount_rub" > 0)
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text,
	"zip" text NOT NULL,
	"country" text DEFAULT 'Россия' NOT NULL,
	"type" "address_type" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"who_user_id" uuid,
	"who_telegram_id" text,
	"scope" text NOT NULL,
	"action" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_user_role" (
	"user_id" uuid NOT NULL,
	"role" "rbac_role" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pk_admin_user_role" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "airdrop_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"trigger" "airdrop_trigger" NOT NULL,
	"reward_vwc" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airdrop_user_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"payload" jsonb,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"code" text,
	"head_code" text,
	"body_code" text,
	"inject_scopes" text[] DEFAULT ARRAY['site']::text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" text,
	"google_id" text,
	"email" text,
	"phone" text,
	"first_name" text,
	"last_name" text,
	"username" text,
	"google_avatar" text,
	"avatar_media_id" uuid,
	"referral_code" text NOT NULL,
	"applied_referral_code" text,
	"referrer_id" uuid,
	"referrer_locked" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"mlm_status" "mlm_status" DEFAULT 'customer' NOT NULL,
	"rank" "mlm_rank" DEFAULT 'member' NOT NULL,
	"activated_at" timestamp with time zone,
	"upgrade_deadline_at" timestamp with time zone,
	"last_login" timestamp with time zone,
	"can_receive_firstline_bonus" boolean DEFAULT false NOT NULL,
	"option3_enabled" boolean DEFAULT false NOT NULL,
	"freedom_shares" jsonb DEFAULT '[25,25,25,25]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"author" text NOT NULL,
	"publish_date" timestamp with time zone DEFAULT now() NOT NULL,
	"category_slug" text,
	"custom_url" text NOT NULL,
	"keywords" text,
	"status" "blog_status" NOT NULL,
	"read_time" integer,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_media_id" uuid,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"seo_title" text,
	"seo_description" text,
	"slug" varchar(255) NOT NULL,
	"status" "category_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"payments_webhook_secret" text,
	"payments_idempotency_header" text,
	"delivery_providers" "delivery_service"[],
	"tariff_cache_ttl_minutes" integer,
	"telegram_bot_token" text,
	"telegram_webhook_url" text,
	"tg_link_ttl_sec" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "owner_type" NOT NULL,
	"owner_id" uuid,
	"type" "account_type" NOT NULL,
	"currency" "currency" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_posting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"txn_id" uuid NOT NULL,
	"debit_account_id" uuid NOT NULL,
	"credit_account_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_posting_accounts_distinct" CHECK ("ledger_posting"."debit_account_id" <> "ledger_posting"."credit_account_id"),
	CONSTRAINT "chk_posting_amount_positive" CHECK ("ledger_posting"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_txn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"op_type" "ledger_op_type" NOT NULL,
	"external_ref" text,
	"user_id" uuid,
	"order_id" uuid,
	"level" integer,
	"reversal_of" uuid,
	"meta" jsonb,
	"reversed_at" timestamp with time zone,
	"reversal_txn_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_ledger_txn_level_range" CHECK (("ledger_txn"."level" IS NULL) OR ("ledger_txn"."level" BETWEEN 1 AND 15))
);
--> statement-breakpoint
CREATE TABLE "levels_matrix_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_note" text,
	"sum_mode" text DEFAULT 'reserve_7pct' NOT NULL,
	"levels" numeric(6, 4)[] NOT NULL,
	"fast_levels" numeric(6, 4)[] NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"activate_at" timestamp with time zone,
	"activated_by_telegram_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_lmv_levels_len" CHECK (array_length("levels_matrix_versions"."levels", 1) = 15),
	CONSTRAINT "chk_lmv_fast_len" CHECK (array_length("levels_matrix_versions"."fast_levels", 1) = 15),
	CONSTRAINT "chk_lmv_sum_mode" CHECK ("levels_matrix_versions"."sum_mode" IN ('reserve_7pct','full'))
);
--> statement-breakpoint
CREATE TABLE "matrix_placement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"position" text,
	"sponsor_id" uuid,
	"level" integer DEFAULT 0 NOT NULL,
	"left_leg_volume" numeric(12, 2) DEFAULT '0' NOT NULL,
	"right_leg_volume" numeric(12, 2) DEFAULT '0' NOT NULL,
	"left_leg_count" integer DEFAULT 0 NOT NULL,
	"right_leg_count" integer DEFAULT 0 NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_matrix_placement_position" CHECK ("matrix_placement"."position" IS NULL OR "matrix_placement"."position" IN ('left', 'right')),
	CONSTRAINT "chk_matrix_placement_level" CHECK ("matrix_placement"."level" >= 0),
	CONSTRAINT "chk_matrix_placement_volumes" CHECK ("matrix_placement"."left_leg_volume" >= 0 AND "matrix_placement"."right_leg_volume" >= 0),
	CONSTRAINT "chk_matrix_placement_counts" CHECK ("matrix_placement"."left_leg_count" >= 0 AND "matrix_placement"."right_leg_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "network_edge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_network_no_self_link" CHECK ("network_edge"."parent_id" <> "network_edge"."child_id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"order_id" uuid,
	"event_type" text,
	"channel" text,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"delivery_status" "delivery_status" DEFAULT 'not_required' NOT NULL,
	"items_subtotal_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"order_base_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_payable_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pv_earned" integer DEFAULT 0 NOT NULL,
	"vwc_cashback" numeric(12, 2) DEFAULT '0' NOT NULL,
	"network_fund_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" "payment_method",
	"promo_code" text,
	"promo_discount_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"comment" text,
	"delivery_required" boolean DEFAULT false NOT NULL,
	"delivery_service" text,
	"delivery_fee_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"delivery_address" text,
	"delivery_tracking_code" text,
	"delivered_at" timestamp with time zone,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_order_subtotal" CHECK ("order"."items_subtotal_rub" >= 0),
	CONSTRAINT "chk_order_discount" CHECK ("order"."discount_total_rub" >= 0),
	CONSTRAINT "chk_order_base" CHECK ("order"."order_base_rub" >= 0),
	CONSTRAINT "chk_order_total" CHECK ("order"."total_payable_rub" >= 0),
	CONSTRAINT "chk_order_pv_earned" CHECK ("order"."pv_earned" >= 0),
	CONSTRAINT "chk_promo_discount_nonneg" CHECK ("order"."promo_discount_rub" >= 0),
	CONSTRAINT "chk_delivery_fee_nonneg" CHECK ("order"."delivery_fee_rub" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"product_slug" text,
	"image_url" text,
	"category_id" uuid,
	"sku" text,
	"qty" integer NOT NULL,
	"unit_price_rub" numeric(12, 2) NOT NULL,
	"line_subtotal_rub" numeric(12, 2) NOT NULL,
	"line_discount_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total_rub" numeric(12, 2) NOT NULL,
	"is_pv_eligible" boolean DEFAULT true NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"pv_each" integer DEFAULT 0 NOT NULL,
	"pv_total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_order_item_qty" CHECK ("order_item"."qty" > 0),
	CONSTRAINT "chk_order_item_unit_price" CHECK ("order_item"."unit_price_rub" >= 0),
	CONSTRAINT "chk_order_item_pv_each" CHECK ("order_item"."pv_each" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"event" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"currency" "currency" DEFAULT 'RUB' NOT NULL,
	"external_id" text,
	"error_code" text,
	"error_message" text,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_amount_positive" CHECK ("payment"."amount_rub" > 0),
	CONSTRAINT "chk_payment_currency_rub" CHECK ("payment"."currency" = 'RUB')
);
--> statement-breakpoint
CREATE TABLE "pro_assignment_pool" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"long_description" text,
	"seo_title" text,
	"seo_description" text,
	"price" numeric(12, 2) NOT NULL,
	"original_price" numeric(12, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" varchar(100),
	"category_id" uuid NOT NULL,
	"capsule_count" integer,
	"capsule_volume" text,
	"servings_per_container" integer,
	"manufacturer" text,
	"country_of_origin" text,
	"expiration_date" text,
	"storage_conditions" text,
	"usage" text,
	"additional_info" text,
	"composition" jsonb,
	"seo_keywords" text,
	"how_to_take" text,
	"benefits" jsonb DEFAULT '[]'::jsonb,
	"is_pv_eligible" boolean DEFAULT true NOT NULL,
	"custom_pv" integer,
	"custom_cashback" numeric(5, 2),
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"ui_status" "ui_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_product_price_nonneg" CHECK ("product"."price" >= 0),
	CONSTRAINT "chk_product_stock_nonneg" CHECK ("product"."stock" >= 0),
	CONSTRAINT "chk_product_custom_pv_nonneg" CHECK ("product"."custom_pv" IS NULL OR "product"."custom_pv" >= 0),
	CONSTRAINT "chk_product_cashback_0_100" CHECK ("product"."custom_cashback" IS NULL OR ("product"."custom_cashback" >= 0 AND "product"."custom_cashback" <= 100))
);
--> statement-breakpoint
CREATE TABLE "promo_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"percent_off" numeric(5, 2),
	"fixed_amount_rub" numeric(12, 2),
	"min_order_rub" numeric(12, 2) DEFAULT '0',
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"one_per_user" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_promo_code_type" CHECK ("promo_code"."type" IN ('percent_off', 'fixed_amount')),
	CONSTRAINT "chk_promo_code_percent_range" CHECK ("promo_code"."percent_off" IS NULL OR ("promo_code"."percent_off" >= 0 AND "promo_code"."percent_off" <= 100)),
	CONSTRAINT "chk_promo_code_fixed_nonneg" CHECK ("promo_code"."fixed_amount_rub" IS NULL OR "promo_code"."fixed_amount_rub" >= 0),
	CONSTRAINT "chk_promo_code_min_order_nonneg" CHECK ("promo_code"."min_order_rub" >= 0),
	CONSTRAINT "chk_promo_code_uses_nonneg" CHECK ("promo_code"."max_uses" IS NULL OR "promo_code"."max_uses" >= 0),
	CONSTRAINT "chk_promo_code_current_uses_nonneg" CHECK ("promo_code"."current_uses" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promo_code_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"discount_rub" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"buy_qty" integer,
	"get_qty" integer,
	"percent_off" numeric(5, 2),
	"fixed_price_rub" numeric(12, 2),
	CONSTRAINT "chk_promo_percent_range" CHECK ("promotion"."percent_off" IS NULL OR ("promotion"."percent_off" >= 0 AND "promotion"."percent_off" <= 100)),
	CONSTRAINT "chk_promo_buy_get_positive" CHECK (("promotion"."buy_qty" IS NULL AND "promotion"."get_qty" IS NULL)
            OR ("promotion"."buy_qty" IS NOT NULL AND "promotion"."buy_qty" > 0 AND "promotion"."get_qty" IS NOT NULL AND "promotion"."get_qty" > 0)),
	CONSTRAINT "chk_promo_fixed_price_nonneg" CHECK ("promotion"."fixed_price_rub" IS NULL OR "promotion"."fixed_price_rub" >= 0),
	CONSTRAINT "chk_promo_period_order" CHECK (("promotion"."starts_at" IS NULL OR "promotion"."ends_at" IS NULL) OR ("promotion"."ends_at" > "promotion"."starts_at"))
);
--> statement-breakpoint
CREATE TABLE "promotion_product" (
	"promotion_id" integer NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "pk_promotion_product" PRIMARY KEY("promotion_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "rank_rules" (
	"rank" "mlm_rank" PRIMARY KEY NOT NULL,
	"name" text,
	"required_pv" numeric(12, 2),
	"required_turnover" numeric(12, 2),
	"bonus_percent" numeric(5, 2),
	"required_lo" numeric(12, 2),
	"required_active_partners" integer,
	"required_branches" integer,
	"hold_months" integer,
	"is_creator" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_rank_rules_bonus_percent_range" CHECK ("rank_rules"."bonus_percent" IS NULL OR ("rank_rules"."bonus_percent" >= 0 AND "rank_rules"."bonus_percent" <= 100)),
	CONSTRAINT "chk_rank_rules_non_negative_nums" CHECK (COALESCE("rank_rules"."required_pv", 0) >= 0
        AND COALESCE("rank_rules"."required_turnover", 0) >= 0
        AND COALESCE("rank_rules"."required_lo", 0) >= 0),
	CONSTRAINT "chk_rank_rules_non_negative_ints" CHECK (COALESCE("rank_rules"."required_active_partners", 0) >= 0
        AND COALESCE("rank_rules"."required_branches", 0) >= 0
        AND COALESCE("rank_rules"."hold_months", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_discount_percent" numeric(5, 2) DEFAULT '10' NOT NULL,
	"network_fund_percent" numeric(5, 2) DEFAULT '50' NOT NULL,
	"vwc_cashback_percent" numeric(5, 2) DEFAULT '5' NOT NULL,
	"free_shipping_threshold_rub" numeric(12, 2) DEFAULT '7500' NOT NULL,
	"delivery_base_price_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pv_rub_per_pv" numeric(12, 2) DEFAULT '200' NOT NULL,
	"rounding_money" text DEFAULT 'half_up' NOT NULL,
	"rounding_pv" text DEFAULT 'floor' NOT NULL,
	"calc_timezone" text DEFAULT 'Europe/Moscow' NOT NULL,
	"is_compression_enabled" boolean DEFAULT false NOT NULL,
	"fast_start_weeks" integer DEFAULT 8 NOT NULL,
	"fast_start_start_point" "fast_start_point" DEFAULT 'activation' NOT NULL,
	"infinity_rate" numeric(6, 4) DEFAULT '0.0025' NOT NULL,
	"option_bonus_percent" numeric(5, 2) DEFAULT '3' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_settle_ref_disc" CHECK ("settlement_settings"."referral_discount_percent" >= 0 AND "settlement_settings"."referral_discount_percent" <= 100),
	CONSTRAINT "chk_settle_net_fund" CHECK ("settlement_settings"."network_fund_percent"     >= 0 AND "settlement_settings"."network_fund_percent"     <= 100),
	CONSTRAINT "chk_settle_vwc_cash" CHECK ("settlement_settings"."vwc_cashback_percent"     >= 0 AND "settlement_settings"."vwc_cashback_percent"     <= 100),
	CONSTRAINT "chk_settle_opt_bonus" CHECK ("settlement_settings"."option_bonus_percent"     >= 0 AND "settlement_settings"."option_bonus_percent"     <= 100),
	CONSTRAINT "chk_settle_infinity" CHECK ("settlement_settings"."infinity_rate" >= 0 AND "settlement_settings"."infinity_rate" <= 1),
	CONSTRAINT "chk_settle_money_nonneg" CHECK ("settlement_settings"."free_shipping_threshold_rub" >= 0 AND "settlement_settings"."delivery_base_price_rub" >= 0),
	CONSTRAINT "chk_settle_fast_weeks" CHECK ("settlement_settings"."fast_start_weeks" BETWEEN 1 AND 52),
	CONSTRAINT "chk_settle_rounding_money" CHECK ("settlement_settings"."rounding_money" IN ('half_up','half_even')),
	CONSTRAINT "chk_settle_rounding_pv" CHECK ("settlement_settings"."rounding_pv" IN ('floor','round'))
);
--> statement-breakpoint
CREATE TABLE "uploaded_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"url" text NOT NULL,
	"public_id" text,
	"format" text,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_uploaded_media_positive" CHECK (COALESCE("uploaded_media"."width", 0) >= 0
            AND COALESCE("uploaded_media"."height", 0) >= 0
            AND COALESCE("uploaded_media"."bytes", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawal_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"status" "withdrawal_status" NOT NULL,
	"method" "payment_method" NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_withdrawal_amount_pos" CHECK ("withdrawal_request"."amount_rub" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_bonus_preferences" (
	"user_id" uuid NOT NULL,
	"health_percent" integer DEFAULT 25 NOT NULL,
	"travel_percent" integer DEFAULT 25 NOT NULL,
	"home_percent" integer DEFAULT 25 NOT NULL,
	"auto_percent" integer DEFAULT 25 NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_bonus_preferences_user_id_pk" PRIMARY KEY("user_id")
);
--> statement-breakpoint
ALTER TABLE "achievement_user" ADD CONSTRAINT "achievement_user_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_user" ADD CONSTRAINT "achievement_user_achievement_id_achievement_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_package" ADD CONSTRAINT "activation_package_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_who_user_id_app_user_id_fk" FOREIGN KEY ("who_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_role" ADD CONSTRAINT "admin_user_role_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airdrop_user_action" ADD CONSTRAINT "airdrop_user_action_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airdrop_user_action" ADD CONSTRAINT "airdrop_user_action_task_id_airdrop_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."airdrop_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_avatar_media_id_uploaded_media_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."uploaded_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_referrer_id_app_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_hero_media_id_uploaded_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."uploaded_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_owner_id_app_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_txn_id_ledger_txn_id_fk" FOREIGN KEY ("txn_id") REFERENCES "public"."ledger_txn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_debit_account_id_ledger_account_id_fk" FOREIGN KEY ("debit_account_id") REFERENCES "public"."ledger_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_credit_account_id_ledger_account_id_fk" FOREIGN KEY ("credit_account_id") REFERENCES "public"."ledger_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_txn" ADD CONSTRAINT "ledger_txn_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_placement" ADD CONSTRAINT "matrix_placement_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_placement" ADD CONSTRAINT "matrix_placement_parent_id_app_user_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_placement" ADD CONSTRAINT "matrix_placement_sponsor_id_app_user_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_edge" ADD CONSTRAINT "network_edge_parent_id_app_user_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_edge" ADD CONSTRAINT "network_edge_child_id_app_user_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_log" ADD CONSTRAINT "order_log_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_promo_code_id_promo_code_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_product" ADD CONSTRAINT "promotion_product_promotion_id_promotion_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_product" ADD CONSTRAINT "promotion_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_media" ADD CONSTRAINT "uploaded_media_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bonus_preferences" ADD CONSTRAINT "user_bonus_preferences_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_achievement_code" ON "achievement" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ix_achievement_active" ON "achievement" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_achievement_user" ON "achievement_user" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "ix_achievement_user_user" ON "achievement_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_achievement_user_ach" ON "achievement_user" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "ix_activation_package_user" ON "activation_package" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_activation_package_type" ON "activation_package" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ix_activation_package_created" ON "activation_package" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_address_user" ON "address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_address_user_default" ON "address" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_address_user_default_true" ON "address" USING btree ("user_id") WHERE "address"."is_default" = true;--> statement-breakpoint
CREATE INDEX "ix_admin_audit_who_user" ON "admin_audit_log" USING btree ("who_user_id");--> statement-breakpoint
CREATE INDEX "ix_admin_audit_who_tg" ON "admin_audit_log" USING btree ("who_telegram_id");--> statement-breakpoint
CREATE INDEX "ix_admin_audit_scope_time" ON "admin_audit_log" USING btree ("scope","created_at");--> statement-breakpoint
CREATE INDEX "ix_admin_audit_scope_action" ON "admin_audit_log" USING btree ("scope","action");--> statement-breakpoint
CREATE INDEX "ix_admin_user_role_role" ON "admin_user_role" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_airdrop_task_code" ON "airdrop_task" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ix_airdrop_task_active" ON "airdrop_task" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_airdrop_user_task" ON "airdrop_user_action" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "ix_airdrop_action_user" ON "airdrop_user_action" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_airdrop_action_task" ON "airdrop_user_action" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "ix_airdrop_action_verified" ON "airdrop_user_action" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "ix_analytics_tag_enabled" ON "analytics_tag" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_user_telegram" ON "app_user" USING btree ("telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_user_google" ON "app_user" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_user_email" ON "app_user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_user_referral_code" ON "app_user" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "ix_app_user_referrer" ON "app_user" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "ix_app_user_active" ON "app_user" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_blog_custom_url" ON "blog_posts" USING btree ("custom_url");--> statement-breakpoint
CREATE INDEX "ix_blog_publish_date" ON "blog_posts" USING btree ("publish_date");--> statement-breakpoint
CREATE INDEX "ix_blog_category" ON "blog_posts" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "ix_blog_status" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_category_slug" ON "category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_category_status" ON "category" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_category_name" ON "category" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_integrations_config_active" ON "integrations_config" USING btree ("is_active") WHERE "integrations_config"."is_active" = true;--> statement-breakpoint
CREATE INDEX "ix_integrations_webhook" ON "integrations_config" USING btree ("telegram_webhook_url");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_ledger_account_owner_kind" ON "ledger_account" USING btree ("owner_type","owner_id","type","currency");--> statement-breakpoint
CREATE INDEX "ix_ledger_account_owner" ON "ledger_account" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "ix_ledger_account_type" ON "ledger_account" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ix_ledger_account_currency" ON "ledger_account" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "ix_posting_txn" ON "ledger_posting" USING btree ("txn_id");--> statement-breakpoint
CREATE INDEX "ix_posting_debit" ON "ledger_posting" USING btree ("debit_account_id");--> statement-breakpoint
CREATE INDEX "ix_posting_credit" ON "ledger_posting" USING btree ("credit_account_id");--> statement-breakpoint
CREATE INDEX "ix_posting_currency" ON "ledger_posting" USING btree ("currency");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_ledger_txn_operation" ON "ledger_txn" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "ix_ledger_txn_user" ON "ledger_txn" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_ledger_txn_order" ON "ledger_txn" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ix_ledger_txn_type" ON "ledger_txn" USING btree ("op_type");--> statement-breakpoint
CREATE INDEX "ix_ledger_txn_reversal" ON "ledger_txn" USING btree ("reversal_of");--> statement-breakpoint
CREATE INDEX "ix_ledger_txn_reversal_txn" ON "ledger_txn" USING btree ("reversal_txn_id");--> statement-breakpoint
CREATE INDEX "ix_ledger_txn_created" ON "ledger_txn" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_lmv_active_once" ON "levels_matrix_versions" USING btree ("is_active") WHERE "levels_matrix_versions"."is_active" = true;--> statement-breakpoint
CREATE INDEX "ix_lmv_active" ON "levels_matrix_versions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ix_lmv_activate_at" ON "levels_matrix_versions" USING btree ("activate_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_matrix_placement_user" ON "matrix_placement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_matrix_placement_parent" ON "matrix_placement" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "ix_matrix_placement_sponsor" ON "matrix_placement" USING btree ("sponsor_id");--> statement-breakpoint
CREATE INDEX "ix_matrix_placement_level" ON "matrix_placement" USING btree ("level");--> statement-breakpoint
CREATE INDEX "ix_matrix_placement_position" ON "matrix_placement" USING btree ("parent_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_network_edge_pair" ON "network_edge" USING btree ("parent_id","child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_network_edge_child" ON "network_edge" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "ix_network_edge_parent" ON "network_edge" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "ix_network_edge_child" ON "network_edge" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "ix_notification_order" ON "notification" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ix_notification_user" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_notification_status" ON "notification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_notification_channel" ON "notification" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "ix_notification_created" ON "notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_order_user" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_order_delivered_at" ON "order" USING btree ("delivered_at");--> statement-breakpoint
CREATE INDEX "ix_order_created_at" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_order_idempotency_key" ON "order" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ix_order_item_order" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ix_order_item_product" ON "order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ix_order_log_order" ON "order_log" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ix_order_log_time" ON "order_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_payment_order" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ix_payment_status" ON "payment" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_payment_external_id" ON "payment" USING btree ("external_id") WHERE "payment"."external_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_pro_assignment_pool_telegram" ON "pro_assignment_pool" USING btree ("telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_slug" ON "product" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_product_sku_nullable" ON "product" USING btree ("sku") WHERE "product"."sku" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_product_category_id" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_product_status" ON "product" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_product_ui_status" ON "product" USING btree ("ui_status");--> statement-breakpoint
CREATE INDEX "ix_product_status_ui" ON "product" USING btree ("status","ui_status");--> statement-breakpoint
CREATE INDEX "ix_product_name" ON "product" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ix_product_price" ON "product" USING btree ("price");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_promo_code_code" ON "promo_code" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ix_promo_code_active" ON "promo_code" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ix_promo_code_expiry" ON "promo_code" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ix_promo_code_usage_promo" ON "promo_code_usage" USING btree ("promo_code_id");--> statement-breakpoint
CREATE INDEX "ix_promo_code_usage_user" ON "promo_code_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_promo_code_usage_order" ON "promo_code_usage" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_promo_code_usage_order_promo" ON "promo_code_usage" USING btree ("order_id","promo_code_id");--> statement-breakpoint
CREATE INDEX "ix_promo_active_time" ON "promotion" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "ix_promo_product_promotion" ON "promotion_product" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "ix_promo_product_product" ON "promotion_product" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ix_rank_rules_is_creator" ON "rank_rules" USING btree ("is_creator");--> statement-breakpoint
CREATE INDEX "ix_settings_key" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "ix_settings_key_effective" ON "settings" USING btree ("key","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_settings_key_effective" ON "settings" USING btree ("key","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_settlement_settings_active" ON "settlement_settings" USING btree ("is_active") WHERE "settlement_settings"."is_active" = true;--> statement-breakpoint
CREATE INDEX "ix_settlement_settings_tz" ON "settlement_settings" USING btree ("calc_timezone");--> statement-breakpoint
CREATE INDEX "ix_uploaded_media_url" ON "uploaded_media" USING btree ("url");--> statement-breakpoint
CREATE INDEX "ix_uploaded_media_user" ON "uploaded_media" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_uploaded_media_public" ON "uploaded_media" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "ix_user_activity_user" ON "user_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_activity_time" ON "user_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_withdrawal_user" ON "withdrawal_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_withdrawal_status" ON "withdrawal_request" USING btree ("status");