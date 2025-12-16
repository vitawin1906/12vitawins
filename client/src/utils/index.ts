/**
 * Централизованный экспорт всех утилит
 * Позволяет импортировать функции из одного места
 */

// Форматирование цен и чисел
export {
  formatPriceRU as formatPrice,
  toNumberSafe,
  calcDiscountPercentage,
  calcSavings,
  calculateBonusCoins,
  calculateCashback,
  getProductCalculations,
  useProductCalculations,
  // Aliases для обратной совместимости
  calculateDiscountPercentage,
  calculateSavings,
} from './productCalculations';

// Форматирование дат
export {
  formatDateRu,
  formatDateShortRu,
  formatDateTimeRu,
  formatDateRelative,
  isValidDate,
  parseDateSafe,
  type DateLike,
} from './dateFormat';

// Расчет бонусов корзины
export {
  calculateItemBonuses,
  calculateTotalBonuses,
  formatBonuses,
  type ItemBonuses,
  type TotalBonuses,
} from './cartBonuses';

// Работа с изображениями
export {
  resolveImageUrl,
  getProductImageUrl,
  getMainProductImage,
  type ImageLike,
  type ImageObject,
  type ImageSource,
} from './imageUtils';

// Legacy exports (для обратной совместимости)
export { formatPrice as formatPriceLegacy } from './priceUtils';
