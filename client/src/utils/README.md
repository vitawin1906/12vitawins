# Утилиты клиентского приложения

## Обзор

Эта директория содержит переиспользуемые утилиты для всего приложения. Все основные функции доступны через централизованный экспорт `utils/index.ts`.

## Основные модули

### 1. Форматирование цен (`productCalculations.ts`)

**Основной модуль для работы с ценами и расчетами.**

```typescript
import { formatPrice, toNumberSafe, calculateBonusCoins, calculateCashback } from '@/utils';

// Форматирование цены
formatPrice(1000); // "1 000 ₽"

// Безопасное преобразование в число
toNumberSafe("1,234.56"); // 1234.56

// Расчет бонусных монет (PV)
calculateBonusCoins(1000); // 5 (1000/200)
calculateBonusCoins(1000, 10); // 10 (кастомное значение)

// Расчет кэшбека
calculateCashback(1000); // 50 (5% от 1000)
calculateCashback(1000, 0.10); // 100 (10% от 1000)
```

**⚠️ Важно:** `priceUtils.ts` помечен как deprecated. Используйте функции из `productCalculations.ts`.

### 2. Форматирование дат (`dateFormat.ts`)

**Единый модуль для форматирования дат.**

```typescript
import { formatDateRu, formatDateShortRu, formatDateTimeRu, formatDateRelative } from '@/utils';

// Полный формат: "1 января 2025"
formatDateRu("2025-01-01");

// Короткий формат: "01.01.2025"
formatDateShortRu("2025-01-01");

// С временем: "1 января 2025, 14:30"
formatDateTimeRu("2025-01-01T14:30:00");

// Относительный: "3 дня назад"
formatDateRelative("2025-01-01");
```

**✅ Все inline форматирование дат заменено на эти функции.**

### 3. Расчет бонусов корзины (`cartBonuses.ts`)

**Расчет бонусов для товаров в корзине.**

```typescript
import { calculateItemBonuses, calculateTotalBonuses } from '@/utils';

const item = {
  price: 1000,
  quantity: 2,
  customPv: 10,
  customCashback: 0.05
};

// Бонусы для одного товара
const bonuses = calculateItemBonuses(item);
// { pv: 20, cashback: 100, coins: 100 }

// Общие бонусы корзины
const total = calculateTotalBonuses([item1, item2]);
// { pv: 45, cashback: 250, coins: 250, itemCount: 5 }
```

**✅ Использует единую логику из `productCalculations.ts`.**

### 4. Работа с изображениями (`imageUtils.ts`)

**Универсальные функции для работы с изображениями.**

```typescript
import { resolveImageUrl, getMainProductImage } from '@/utils';

// Получить URL из различных форматов
resolveImageUrl({ url: "https://..." }); // полный URL
resolveImageUrl({ mediaId: "public_id" }); // Cloudinary public_id
resolveImageUrl("https://..."); // строка

// Главное изображение продукта
getMainProductImage(product); // учитывает role='main', sortOrder
```

## Централизованный импорт

Все основные утилиты доступны через `@/utils`:

```typescript
// ✅ Правильно
import { formatPrice, formatDateRu, calculateItemBonuses } from '@/utils';

// ❌ Избегайте прямых импортов (если не нужны специфичные типы)
import { formatPriceRU } from '@/utils/productCalculations';
```

## Устраненные дубликаты

### ✅ Форматирование цен
- **Было:** дубликаты в `productCalculations.ts` и `priceUtils.ts`
- **Стало:** единая логика в `productCalculations.ts`, `priceUtils.ts` — deprecated обертка

### ✅ Расчет бонусов
- **Было:** дублирование логики между `productCalculations.ts` и `cartBonuses.ts`
- **Стало:** `cartBonuses.ts` использует функции из `productCalculations.ts`

### ✅ Форматирование дат
- **Было:** inline форматирование в 15+ компонентах
- **Стало:** единый модуль `dateFormat.ts` с централизованными функциями

## Миграция кода

### Замена форматирования дат

```typescript
// ❌ Старый код
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// ✅ Новый код
import { formatDateRu } from '@/utils';
// используйте formatDateRu(date)
```

### Замена форматирования цен

```typescript
// ❌ Старый код
import { formatPrice } from '@/utils/priceUtils';

// ✅ Новый код
import { formatPrice } from '@/utils';
```

## Лучшие практики

1. **Используйте централизованный импорт** из `@/utils`
2. **Не создавайте inline форматирование** — всегда используйте утилиты
3. **Не дублируйте логику расчетов** — проверьте существующие функции
4. **Документируйте новые утилиты** в этом файле

## Структура

```
utils/
├── index.ts                    # Централизованный экспорт
├── README.md                   # Эта документация
├── productCalculations.ts      # ⭐ Цены, бонусы, расчеты
├── dateFormat.ts              # ⭐ Форматирование дат
├── cartBonuses.ts             # ⭐ Бонусы корзины
├── imageUtils.ts              # ⭐ Работа с изображениями
├── priceUtils.ts              # ⚠️ DEPRECATED - используйте productCalculations
├── bonuses.ts                 # Дополнительные бонусные утилиты
├── pv.ts                      # PV константы и расчеты
└── ...                        # Другие модули
```

---

**Дата последнего обновления:** 2025-01-29
**Автор рефакторинга:** Claude Code
