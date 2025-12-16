/**
 * Утилиты для расчета бонусов в корзине
 *
 * Используется для:
 * - Отображения бонусов по каждому товару в корзине
 * - Подсчета общих бонусов в checkout
 * - Унификации логики расчетов
 *
 * ВАЖНО: использует единую логику из productCalculations.ts
 */

import type { LocalCartItem } from '@/types/cart';
import { calculateBonusCoins, calculateCashback } from './productCalculations';

/**
 * Результат расчета бонусов для товара
 */
export interface ItemBonuses {
  pv: number;           // PV баллы для MLM
  cashback: number;     // Кэшбек в рублях
  coins: number;        // Монеты (= cashback)
}

/**
 * Общие бонусы для всей корзины
 */
export interface TotalBonuses {
  pv: number;
  cashback: number;
  coins: number;
  itemCount: number;
}

/**
 * Рассчитывает бонусы для одного товара в корзине
 * @param item - товар из корзины
 * @returns объект с PV, кэшбеком и монетами
 */
export function calculateItemBonuses(item: LocalCartItem): ItemBonuses {
  const itemTotal = item.price * item.quantity;

  // Используем единую логику из productCalculations.ts
  // PV: учитываем количество товара
  const pvPerItem = calculateBonusCoins(item.price, item.customPv);
  const pv = pvPerItem * item.quantity;

  // Кэшбек: рассчитываем от общей суммы
  const cashback = calculateCashback(itemTotal, item.customCashback);

  // Монеты = кэшбек в рублях (1 монета = 1 рубль)
  const coins = cashback;

  return {
    pv,
    cashback,
    coins,
  };
}

/**
 * Рассчитывает общие бонусы для всей корзины
 * @param items - все товары в корзине
 * @returns суммарные PV, кэшбек и монеты
 */
export function calculateTotalBonuses(items: LocalCartItem[]): TotalBonuses {
  return items.reduce(
    (acc, item) => {
      const itemBonuses = calculateItemBonuses(item);
      return {
        pv: acc.pv + itemBonuses.pv,
        cashback: acc.cashback + itemBonuses.cashback,
        coins: acc.coins + itemBonuses.coins,
        itemCount: acc.itemCount + item.quantity,
      };
    },
    { pv: 0, cashback: 0, coins: 0, itemCount: 0 }
  );
}

/**
 * Форматирует бонусы для отображения
 */
export function formatBonuses(bonuses: ItemBonuses | TotalBonuses): {
  pvText: string;
  cashbackText: string;
  coinsText: string;
} {
  return {
    pvText: `+${bonuses.pv} PV`,
    cashbackText: `${bonuses.cashback} ₽`,
    coinsText: `${bonuses.coins} монет`,
  };
}
