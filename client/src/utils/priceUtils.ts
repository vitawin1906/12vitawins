/**
 * Утилиты для форматирования цен
 * @deprecated Используйте функции из productCalculations.ts
 */

import { formatPriceRU, toNumberSafe } from './productCalculations';

/**
 * Форматирует цену в формате "1000 ₽" (целые числа)
 * @deprecated Используйте formatPriceRU из productCalculations.ts
 */
export function formatPrice(price: string | number): string {
  return formatPriceRU(price);
}

/**
 * Форматирует цену без символа валюты в формате "1000" (целые числа)
 */
export function formatPriceNumber(price: string | number): string {
  return Math.round(toNumberSafe(price)).toLocaleString('ru-RU');
}

/**
 * Преобразует строку цены в число с округлением
 */
export function normalizePrice(price: string | number): number {
  return Math.round(toNumberSafe(price));
}