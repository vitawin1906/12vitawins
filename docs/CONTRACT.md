
# ✅ **CONTRACT.md — Технический контракт проекта VitaWin**

**Версия: v0.3.1 (исправлено, окт 2025)**
**Статус: активный, синхронизирован с Registry v0.4.1**

Документ определяет обязательные интерфейсы и инварианты между Frontend, Backend, Admin и интеграциями.
Все поля и модели обязаны соответствовать docs/Registry.md (SSOT).

Любые изменения требуют:

* миграции Drizzle,
* обновления Zod,
* обновления Registry,
* обновления DTO,
* аудита изменений в админке.

---

# **1) Область действия и цели**

Система реализует e-commerce MLM-платформу с:

* Авторизацией через Telegram и Email.
* Единым публичным **referral_code** для всех пользователей.
* Автоматическими PV/VWC/сетевыми бонусами.
* Леджером (double-entry) и идемпотентностью.
* Возможностью вывода денежных бонусов.
* Полным процессом заказа: checkout → оплата → доставка → delivered → начисления.

Все расчёты строго соответствуют Маркетинг-плану (Приложение А).

---

# **2) Термины и глобальные параметры**

### Валюта:

* **RUB**

### Внутренняя валюта:

* **VWC**

### PV:

* `PV = floor(order_base / 200)`

### Точка принятия времени:

* **Europe/Moscow**

### Публичный реф-код:

* **referral_code**, уникальный.
* Для TG-пользователей: `referral_code = telegram_id`.
* Для остальных: генератор (`ref_xxxxxxxx`).
* Используется для приглашения и определения `referrer_id`.

### Округление:

* round half up, 2 знака после запятой.

### Идентификатор пользователя:

* `id uuid`
* единственный внутренний ID
* используется для всех связей и ссылок.

---

# **3) Архитектура и контуры**

* **Frontend:** Next.js 14, server actions, hydration safe components.
* **Backend:** Node.js + TypeScript + Drizzle ORM + PostgreSQL 16.
* **Admin:** React + RBAC + журнал аудита.
* **Integrations:** Платёжка, Доставка, Telegram бот.
* **Ledger:** double-entry, idempotency, atomic posting.

---

# **4) Инварианты контракта (строго обязательные)**

### 4.1. Модели

`Zod DTO` = `Drizzle schema` = `UI формы`
Source of truth → **Registry.md**

### 4.2. Начисления

* Только при `order.status = delivered`.
* `order_base` = eligible позиции, минус скидки, без доставки.
* NetworkFund = `round(order_base * 0.50, 2)`
* Σ(L1..L15) = `0.93` или `1.00`.
* customer НЕ получает бонусов

    * исключение: `can_receive_firstline_bonus = true` → только L1.

### 4.3. Леджер

* `sum(debits) = sum(credits)` в валюте.
* `idempotency_key` уникален.
* Повторный webhook не меняет состояние.

### 4.4. RBAC

* admin
* finance
* support
* editor
* user
  Все изменения настроек → аудит.

---

# **5) Модель данных (сводно)**

См. Registry.md:

* app_user
* network_edge
* product
* order, order_item, payment
* account, ledger_txn, ledger_posting
* settings
* volume_*
* withdrawal_request

Все поля и типы должны совпадать.

---

# **6) Бизнес-правила расчётов**

### 6.1. Скидки

* referral_10 применяется последней.

### 6.2. Бонусы

* PV = floor(order_base / 200)
* VWC = 5%
* NetworkFund = 50%

### 6.3. Распределение уровней

* 1…15 уровни без компрессии
* share[k] = round(NetworkFund * L[k], 2)

### 6.4. Fast Start

Первые 8 недель:

* первые 2 месяца: 25% L1
* далее: 20% L1
  Заменяет обычный L1.

### 6.5. Infinity

* 0.25% от глубины ниже 16 уровня
* 20/80 split при равных рангах

### 6.6. Option 3%

* Если `option3_enabled`, начисление 3% от ГО в конце периода.

### 6.7. Activation Bonus

* 750 или 1250 RUB за приглашённого активировавшегося реферала
* UNIQUE(invitee_id, type)

---

# **6.9. Creator Pool & пользователи без реф-кода (исправлено полностью)**

Этот раздел синхронизирован с Registry v0.4.1.

## 6.9.1. Создание user без реф-кода

Backend обязан:

1. Создать `app_user` со статусом:

    * `customer`

2. Присвоить `referrer_id` из creator_pool.

3. Создать network_edge:

    * parent_id = выбранный creator
    * child_id = user.id

4. Зафиксировать referrer_id навсегда (immutable).

---

## 6.9.2. Алгоритм выбора creator

Backend использует один из:

* round-robin
* random
* CreatorPoolService (например, балансировка по загрузке)

Запрещено смещение в сторону конкретного creator.

---

## 6.9.3. Правила начислений для orphan user

customer НЕ получает:

* PV
* VWC
* сетевые бонусы
* спец-бонусы

Все бонусы идут вверх по структуре, начиная с creator.

---

## 6.9.4. Инфлюенсеры / блогеры

Если `can_receive_firstline_bonus = true`:

* user получает **только L1**
* остаётся `customer`
* не участвует в MLM выше первого уровня

Используется для блогеров.

---

## 6.9.5. Ошибки и валидация

Backend обязан:

* **500** — если creator_pool пуст
* **409** — если referrer_id уже закреплён
* **422** — если creator_pool содержит неверные user.id

---

## 6.9.6. Требования к API

Все эндпоинты создания user и оформления заказов обязаны:

* автоматически применять creator_pool
* всегда возвращать `referrer_id` в:

    * `/api/me`
    * `/api/orders/:id`

**referrer_id никогда не меняется.**

---

# **7) События и идемпотентность**

* Каждый webhook содержит `Idempotency-Key`.
* Повторное событие не влияет на состояние.
* Refund создаёт новый ledger_txn с meta.reversal_of.

---

# **8) API (публичное и служебное)**

### 8.1. Авторизация

* `POST /api/auth/telegram`
* `POST /api/auth/login`
* `POST /api/auth/register`
* `GET /api/me`
* `POST /api/me/refcode`

### 8.2. Каталог/корзина

* `GET /api/products`
* `POST /api/cart`
* `POST /api/checkout`

### 8.3. Заказы/оплаты

* `GET /api/orders/:id`
* `POST /webhooks/payment`
* `POST /webhooks/shipping`

### 8.4. MLM

* `GET /api/network/firstline`
* `GET /api/network/tree`

### 8.5. Балансы/лемджер

* `GET /api/balances`
* `GET /api/ledger`

### 8.6. Вывод средств

* `POST /api/withdrawals`
* `GET /api/withdrawals`

---

# **9) Начисления — порядок**

При delivered:

1. Создаётся один ledger_txn (atomic).
2. PV, VWC, L1–L15, спец-бонусы — в одном txn.
3. posting: минимум один debit/credit.
4. Уведомления пользователю.

---

# **10) Возвраты**

### returned_full

100% сторно → один reversal transaction.

### returned_partial

Пропорциональное сторно → series of reversal transactions.

Каждое сторно — новый ledger_txn.

---

# **11) RBAC и аудит**

* Все изменения настроек → журнал аудита.
* Настройки (levels, creator_pool, fast_start…) меняют только admin.

---

# **12) Безопасность / DevOps**

* Helmet
* Rate-limit
* Логи запросов
* tsc + unit + e2e в CI/CD
* PostgreSQL backups ≥ 30 дней
* Secrets через Secret Manager

---

# **13) Тест-пак (обязательный)**

### Unit:

* PV/VWC/Fund
* Σ(L1..L15)
* referral 10%
* idempotency

### E2E:

* paid → delivered → начисления
* partial refund
* fast start
* infinity
* option3
* creator pool
* orphan users

### Property-based:

* случайная сеть, проверки инвариантов.

---

# **14) DoD (Definition of Done)**

* tsc — без ошибок
* тесты зелёные
* демонстрация полного бизнес-флоу:
  TG → заказ → оплата → доставка → delivered → начисления → вывод средств

---

# **15) Версионирование**

Любое изменение ошибок/типов:

* миграции Drizzle
* обновление Zod
* обновление DTO
* обновление Registry
* аудит изменений

---

# **16) Приложения**

A. Спецификация расчётов
B. Этапы разработки
C. Леджер
D. RBAC
E. Интеграции
F. Security/DPA

---

# **17) VERIFY-пункты**

* Матрица L1..L15
* Начало Fast Start
* TTL VWC
* Порог бесплатной доставки
* Налоги
* Юрисдикция

---