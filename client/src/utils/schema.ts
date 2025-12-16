
// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegram_id: bigint("telegram_id", { mode: "number" }).unique(),
  name: text("name"),
  email: text("email").unique(),
  password_hash: text("password_hash"),
  phone: text("phone"),
  partner_status: text("partner_status"),
  first_purchase_amount: decimal("first_purchase_amount", { precision: 12, scale: 2 }),
  first_purchase_date: date("first_purchase_date"),
  partner_upgrade_start_date: date("partner_upgrade_start_date"),
  partner_upgrade_deadline: date("partner_upgrade_deadline"),
  total_orders_amount: decimal("total_orders_amount", { precision: 12, scale: 2 }).default("0"),
  lo: decimal("lo", { precision: 12, scale: 2 }).default("0"),
  go: decimal("go", { precision: 12, scale: 2 }).default("0"),
  is_active: boolean("is_active").default(true),
  last_active_date: date("last_active_date"),
  pro_badge: boolean("pro_badge").default(false),
  is_admin: boolean("is_admin").default(false),
  assigned_branch_number: integer("assigned_branch_number"),
  personal_bonus: decimal("personal_bonus", { precision: 12, scale: 2 }).default("0"),
  referral_discount_used: boolean("referral_discount_used").default(false),
  referral_code: text("referral_code"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Ranks
export const ranks = pgTable("ranks", {
  id: serial("id").primaryKey(),
  name: text("name"),
  required_pv: decimal("required_pv", { precision: 12, scale: 2 }),
  required_turnover: decimal("required_turnover", { precision: 12, scale: 2 }),
  bonus_percent: decimal("bonus_percent", { precision: 5, scale: 2 })
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  h1: text("h1"),
  seo_title: text("seo_title"),
  seo_description: text("seo_description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  original_price: decimal("original_price", { precision: 12, scale: 2 }),
  custom_pv: decimal("custom_pv", { precision: 12, scale: 2 }),
  custom_cashback: decimal("custom_cashback", { precision: 12, scale: 2 }),
  pv_auto: decimal("pv_auto", { precision: 12, scale: 2 }),
  cashback_auto: decimal("cashback_auto", { precision: 12, scale: 2 }),
  slug: text("slug").unique(),
  description: text("description"),
  long_description: text("long_description"),
  in_stock: boolean("in_stock").default(true),
  status: text("status").default("active"),
  is_pv_eligible: boolean("is_pv_eligible").default(true),
  // legacy-compat fields
  name: text("name"),
  badge: text("badge"),
  image: text("image"),
  images: jsonb("images").default("[]"),
  category: text("category"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  total_price: decimal("total_price", { precision: 12, scale: 2 }),
  pv_amount: decimal("pv_amount", { precision: 12, scale: 2 }),
  cashback_amount: decimal("cashback_amount", { precision: 12, scale: 2 }),
  status: text("status"),
  delivery_service_id: text("delivery_service_id"),
  delivery_address: text("delivery_address"),
  is_forwarded_to_partner: boolean("is_forwarded_to_partner").default(false),
  assigned_partner_id: integer("assigned_partner_id").references(() => users.id),
  telegram_notified: boolean("telegram_notified").default(false),
  email_notified: boolean("email_notified").default(false),
  checkout_return_status: text("checkout_return_status"),
  source: text("source"),
  is_personal_purchase: boolean("is_personal_purchase").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Network connections
export const network_connections = pgTable("network_connections", {
  id: serial("id").primaryKey(),
  parent_id: integer("parent_id").references(() => users.id),
  child_id: integer("child_id").references(() => users.id),
  root_id: integer("root_id").references(() => users.id),
  level: integer("level"),
  branch_number: integer("branch_number"),
  group_turnover: decimal("group_turnover", { precision: 12, scale: 2 }).default("0"),
  branch_pv: decimal("branch_pv", { precision: 12, scale: 2 }).default("0"),
  first_line_purchases: integer("first_line_purchases").default(0),
  is_first_line: boolean("is_first_line").default(false)
});

// User MLM Status
export const user_mlm_status = pgTable("user_mlm_status", {
  user_id: integer("user_id").primaryKey().references(() => users.id),
  current_pv: decimal("current_pv", { precision: 12, scale: 2 }).default("0"),
  total_pv: decimal("total_pv", { precision: 12, scale: 2 }).default("0"),
  rank_id: integer("rank_id").references(() => ranks.id),
  partners_count: integer("partners_count").default(0),
  hold_until: date("hold_until")
});

// User Bonus Preferences
export const user_bonus_preferences = pgTable("user_bonus_preferences", {
  user_id: integer("user_id").primaryKey().references(() => users.id),
  health_percent: integer("health_percent").default(25),
  travel_percent: integer("travel_percent").default(25),
  auto_percent: integer("auto_percent").default(25),
  home_percent: integer("home_percent").default(25)
});

// Wallets
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").unique().references(() => users.id),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0")
});

// Bonuses
export const bonuses = pgTable("bonuses", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  type: text("type"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  source_user_id: integer("source_user_id").references(() => users.id),
  order_id: integer("order_id").references(() => orders.id),
  date: timestamp("date").defaultNow()
});

// Wallet transactions
export const wallet_transactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  wallet_id: integer("wallet_id").references(() => wallets.id),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  type: text("type"),
  bonus_type: text("bonus_type"),
  related_bonus_id: integer("related_bonus_id").references(() => bonuses.id),
  date: timestamp("date").defaultNow()
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  order_id: integer("order_id").references(() => orders.id),
  event_type: text("event_type"),
  channel: text("channel"),
  message: text("message"),
  status: text("status").default("pending"),
  created_at: timestamp("created_at").defaultNow(),
  sent_at: timestamp("sent_at")
});

// Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  seo_title: text("seo_title"),
  seo_description: text("seo_description")
});

// Product Images
export const product_images = pgTable("product_images", {
  id: serial("id").primaryKey(),
  product_id: integer("product_id").references(() => products.id),
  url: text("url").notNull(),
  alt_text: text("alt_text"),
  webp_url: text("webp_url"),
  thumbnail_url: text("thumbnail_url")
});

// Cart Items
export const cart_items = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id),
  product_id: integer("product_id").references(() => products.id),
  quantity: integer("quantity").default(1)
});

// Product Categories junction
export const product_categories = pgTable("product_categories", {
  product_id: integer("product_id").references(() => products.id),
  category_id: integer("category_id").references(() => categories.id)
});

// Site settings
export const site_settings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  setting_key: text("setting_key").unique().notNull(),
  setting_value: text("setting_value"),
  setting_type: text("setting_type").default("text"),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Blog Posts
export const blog_posts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title"),
  h1: text("h1"),
  seo_title: text("seo_title"),
  seo_description: text("seo_description"),
  slug: text("slug").unique(),
  content: text("content"),
  related_products: jsonb("related_products").default("[]"),
  author_id: integer("author_id"),
  published: boolean("published").default(false),
  image_id: integer("image_id"),
  created_at: timestamp("created_at").defaultNow()
});

// Achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  reward_amount: decimal("reward_amount", { precision: 12, scale: 2 }),
  reward_currency: text("reward_currency")
});

// Airdrops
export const airdrops = pgTable("airdrops", {
  id: serial("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  reward_amount: decimal("reward_amount", { precision: 12, scale: 2 }),
  reward_currency: text("reward_currency"),
  trigger_type: text("trigger_type"),
  start_date: date("start_date"),
  end_date: date("end_date")
});

// Config
export const config = pgTable("config", {
  id: serial("id").primaryKey(),
  default_pv_rate: decimal("default_pv_rate", { precision: 12, scale: 2 }),
  default_cashback_rate: decimal("default_cashback_rate", { precision: 12, scale: 2 }),
  mlm_levels_count: integer("mlm_levels_count"),
  fast_start_duration_months: integer("fast_start_duration_months"),
  fast_start_first_line_percent: decimal("fast_start_first_line_percent", { precision: 5, scale: 2 }),
  fast_start_after_percent: decimal("fast_start_after_percent", { precision: 5, scale: 2 }),
  leader_bonus_percent: decimal("leader_bonus_percent", { precision: 5, scale: 2 }),
  invite_partner_bonus_amount: decimal("invite_partner_bonus_amount", { precision: 12, scale: 2 }),
  invite_pro_bonus_amount: decimal("invite_pro_bonus_amount", { precision: 12, scale: 2 }),
  pro_upgrade_days: integer("pro_upgrade_days"),
  referral_discount: decimal("referral_discount", { precision: 5, scale: 2 }),
  group_turnover_bonus_percent: decimal("group_turnover_bonus_percent", { precision: 5, scale: 2 }),
  delivery_service_api_key: text("delivery_service_api_key"),
  telegram_bot_token: text("telegram_bot_token"),
  double_auth_enabled: boolean("double_auth_enabled").default(false),
  captcha_enabled: boolean("captcha_enabled").default(true),
  default_partner_pro_id: integer("default_partner_pro_id").references(() => users.id)
});

// Matrix Distribution
export const matrix_distribution = pgTable("matrix_distribution", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  matrix_level: integer("matrix_level"),
  matrix_position: integer("matrix_position"),
  parent_position: integer("parent_position"),
  created_at: timestamp("created_at").defaultNow()
});

// В schema.ts добавьте эти поля к uploaded_images:
export const uploaded_images = pgTable("uploaded_images", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  original_filename: text("original_filename"),
  url: text("url"),
  alt_text: text("alt_text"),
  webp_url: text("webp_url"),
  thumbnail_url: text("thumbnail_url"),
  mime_type: text("mime_type"),
  file_size: integer("file_size"),
  product_id: integer("product_id").references(() => products.id),
  is_primary: boolean("is_primary").default(false),
  display_order: integer("display_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});