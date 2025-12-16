
---

# ✅ **Registry.md — VitaWin Unified Business & Technical Spec (v0.4.1, исправленная версия)**

**Статус: канонично. SSOT.**

Backend, Frontend, Admin и AI-assistant обязаны соответствовать документу.

---

# **0. Цели системы**

1. Продажа товаров.
2. MLM-структура без компрессии на 15 уровней.
3. Автоматические бонусы PV/VWC/Network/спец-бонусы.
4. Привязка клиентов через Telegram / публичный реф-код / creator_pool.
5. Активационные пакеты (7500 / 30000) → partner / partner_pro.
6. Единый леджер (double-entry, idempotency).
7. Вывод бонусов (RUB).

---

# **1. Глобальные правила расчётов**

* `order_base` = eligible товары после всех скидок, **кроме** доставки.
* PV = `floor(order_base / 200)`
* VWC = `round(order_base * 0.05, 2)`
* NetworkFund = `round(order_base * 0.50, 2)`
* Начисления → только при `delivered`.
* Реф. скидка 10% применяется последней.
* Компрессии нет.
* `customer` НЕ получает бонусов (кроме L1, если включён флаг).

---

# **2. ENUM (единые для FE/DTO/SQL)**

* **mlm_status:** `customer | partner | partner_pro`
* **payment_method:** `card | sbp | wallet | cash | promo`
* **order_status:** `new | pending | paid | shipped | delivered | canceled | returned_partial | returned_full`
* **payment_status:** `init | awaiting | authorized | captured | refunded | failed`
* **discount_type:** `line_item | cart_fixed | cart_percent | referral_10`
* **currency:** `RUB | PV | VWC`
* **ledger_op_type:** `order_accrual | refund | bonus_fast_start | bonus_infinity | bonus_activation | bonus_option3 | withdrawal_request | withdrawal_payout`

---

# **3. Сущности (SQL → DTO → Правила)**

## **3.1. Пользователь (app_user)**

### ✔ SQL (исправлено)

```
app_user(
  id uuid pk,
  telegram_id text unique,
  referral_code text unique not null,
  phone text,
  email text,
  first_name text,
  last_name text,
  mlm_status mlm_status default 'customer',
  activated_at timestamptz,
  upgrade_deadline_at timestamptz,
  referrer_id uuid references app_user(id),
  can_receive_firstline_bonus boolean default false,
  option3_enabled boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

### ✔ DTO

```
User {
  id,
  telegram_id,
  referral_code,
  mlm_status,
  referrer_id,
  can_receive_firstline_bonus,
  option3_enabled,
}
```

### ✔ Бизнес-правила (исправлено)

* `referrer_id` присваивается **один раз** и **никогда не меняется**.
* `referral_code` — публичный код, уникальный:

    * если есть telegram_id → = telegram_id
    * иначе генерируется системой (`ref_xxxxxxxx`).
* `customer` не получает бонусов (кроме L1 по флагу).
* `partner` = activation_package(7500).
* `partner_pro` = activation_package(30000).
* `can_receive_firstline_bonus` = customer получает только L1.

---

## **3.2. Activation Package (НОВЫЙ)**

SQL:

```
activation_package(
 id uuid pk,
 user_id uuid references app_user(id),
 type text check(type in ('partner','partner_pro')),
 amount_rub numeric(12,2),
 created_at timestamptz default now()
)
```

Правила:

* type='partner' → mlm_status=partner
* type='partner_pro' → mlm_status=partner_pro
* upgrade partner→partner_pro разрешён 5 недель от activated_at

---

## **3.3. Creator Pool & Orphan Users**

SQL:

```
settings.key = "creator_pool"
settings.value_json = [uuid, uuid, uuid...]
```

Правила (исправлено):

* Если пользователь **без telegram_id** И **без referral_code в запросе**
  → назначается referrer из creator_pool.
* Создаётся `network_edge`.
* customer от creator_pool бонусов не получает.
* creator_pool не может быть пустым.
* Алгоритм выбора: round-robin или random.

---

## **3.4. Network (аплайн)**

SQL:

```
network_edge(
  id uuid pk,
  parent_id uuid references app_user(id),
  child_id uuid unique references app_user(id),
  created_at timestamptz default now()
)
```

Правила:

* Каждый user имеет ровно 1 parent или creator.
* Нет циклов.
* Нет компрессии.

---

## **3.5–3.9.** (без изменений — всё корректно)

---

# **4. Алгоритмы начислений**

Все пункты остаются как есть. Без изменений.

---

# **5–7. Refund, Idempotency, Settings — корректно**

Оставляем.

---

# **8. Бизнес-инварианты (исправлено)**

* customer **не получает** PV/VWC/Network/FastStart/Infinity
* customer получает **только L1**, если включён флаг
* referrer_id **неизменяем**
* referral_code — уникальный, используется для присвоения referrer_id
* все бонусы только при delivered
* Σ(L) = 0.93 или 1.00
* idempotency строго обязателен

---

# **9. Резюме для AI (исправлено)**

1. User: customer/partner/partner_pro; referrer_id immutable.
2. referral_code — публичный, уникальный; для Telegram = telegram_id.
3. Creator_pool назначает referrer для пользователей без кода/telegram.
4. Order_base = eligible items minus all discounts except shipping.
5. Bonuses only at delivered.
6. PV=floor(order_base/200), VWC=5%, NetworkFund=50%.
7. customer не получает MLM (кроме L1 по флагу).
8. Ledger double-entry; idempotency required.
9. Refunds → proportional reverse txns.
10. Settings control levels, pool, fast_start, infinity, option3.

---
