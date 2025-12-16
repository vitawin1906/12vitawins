/**
 * Bonus and cashback calculation utilities
 *
 * ВАЖНО: customCashback приходит с бэкенда как ДОЛЯ (0..1), а не процент!
 * Например: 0.05 = 5%, 0.10 = 10%
 *
 * Логика:
 * - Кэшбек в рублях = сумма * доля (по умолчанию 5%)
 * - Монеты VitaWin Coin = кэшбек в рублях (1 монета = 1 рубль)
 */

const DEFAULT_CASHBACK_FRACTION = 0.05; // 5%

/**
 * Рассчитывает кешбэк (5% от суммы покупки по умолчанию)
 * @param amount - сумма покупки в рублях
 * @param customCashbackFraction - кастомная доля кешбэка 0..1 (0.05 = 5%), приходит с бэка
 * @returns сумма кешбэка в рублях (округление вверх)
 */
export function calculateCashback(
  amount: number,
  customCashbackFraction?: number | null
): number {
  if (amount <= 0) return 0;

  // customCashbackFraction - это ДОЛЯ 0..1, а не процент!
  const fraction = customCashbackFraction ?? DEFAULT_CASHBACK_FRACTION;
  return Math.ceil(amount * fraction);
}

/**
 * Рассчитывает количество VitaWin Coin за кешбэк
 * @param amount - сумма покупки в рублях
 * @param customCashbackFraction - кастомная доля кешбэка 0..1
 * @returns количество монет (равно кешбэку в рублях: 1 монета = 1 рубль)
 */
export function calculateVitaWinCoins(
  amount: number,
  customCashbackFraction?: number | null
): number {
  return calculateCashback(amount, customCashbackFraction);
}

/**
 * Получает полную информацию о бонусах для суммы
 * @param amount - сумма покупки в рублях
 * @param customCashbackFraction - кастомная доля кешбэка 0..1 (0.05 = 5%)
 * @returns объект с информацией о всех бонусах
 */
export function getBonusInfo(
  amount: number,
  customCashbackFraction?: number | null
) {
  const cashback = calculateCashback(amount, customCashbackFraction);
  const coins = cashback; // монеты = кешбэк в рублях

  // Преобразуем долю в проценты для отображения
  const percent = customCashbackFraction != null
    ? Math.round(customCashbackFraction * 100)
    : Math.round(DEFAULT_CASHBACK_FRACTION * 100);

  return {
    cashback,           // сумма кешбэка в рублях
    coins,              // количество монет (= cashback)
    cashbackPercent: percent, // процент для отображения (5, 10, и т.д.)
    isCustom: customCashbackFraction != null
  };
}
