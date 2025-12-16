/**
 * Address normalization utilities
 *
 * Backend отдаёт snake_case, baseQuery автоматически преобразует в camelCase.
 * Эти утилиты обрабатывают типы и форматирование.
 */

import type { Address, AddressType } from '@/types/address';

/**
 * Логирование для отладки (только в dev)
 */
const DEBUG = import.meta.env.DEV;

function log(label: string, data: any) {
  if (DEBUG) {
    console.log(`[Address Normalize] ${label}:`, data);
  }
}

/* ======================== Address Normalization ======================== */

/**
 * Нормализует Address с backend
 */
export function normalizeAddressFromApi(raw: any): Address {
  if (!raw) {
    throw new Error('normalizeAddressFromApi: raw data is null/undefined');
  }

  log('RAW Address from backend', raw);

  const normalized: Address = {
    id: String(raw.id),
    userId: String(raw.userId),
    name: String(raw.name || ''),
    address: String(raw.address || ''),
    city: String(raw.city || ''),
    state: raw.state || null,
    zip: String(raw.zip || ''),
    country: String(raw.country || 'Россия'),
    type: (raw.type || 'home') as AddressType,
    isDefault: Boolean(raw.isDefault),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };

  log('NORMALIZED Address for frontend', normalized);

  return normalized;
}

/**
 * Нормализует массив адресов
 */
export function normalizeAddressesFromApi(rawArray: any[]): Address[] {
  if (!Array.isArray(rawArray)) {
    console.warn('[normalizeAddresses] Expected array, got:', typeof rawArray);
    return [];
  }

  return rawArray
    .map((raw, index) => {
      try {
        return normalizeAddressFromApi(raw);
      } catch (error) {
        console.error(`[normalizeAddresses] Error at index ${index}:`, error, raw);
        return null;
      }
    })
    .filter((addr): addr is Address => addr !== null);
}

/* ======================== Formatting Utilities ======================== */

/**
 * Форматирует адрес в одну строку для отображения
 */
export function formatAddressOneLine(address: Address): string {
  const parts = [
    address.address,
    address.city,
    address.state,
    address.zip,
    address.country !== 'Россия' ? address.country : null,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Форматирует адрес в несколько строк для отображения
 */
export function formatAddressMultiLine(address: Address): string[] {
  return [
    address.name,
    address.address,
    `${address.city}${address.state ? ', ' + address.state : ''}, ${address.zip}`,
    address.country,
  ].filter(Boolean);
}

/**
 * Получает иконку для типа адреса
 */
export function getAddressTypeIcon(type: AddressType): string {
  return type === 'home' ? '🏠' : '🏢';
}

/**
 * Получает человекочитаемое название типа адреса
 */
export function getAddressTypeName(type: AddressType): string {
  return type === 'home' ? 'Дом' : 'Работа';
}

/**
 * Валидация почтового индекса (Россия)
 */
export function validateZipCode(zip: string): boolean {
  // Российский индекс: 6 цифр
  return /^\d{6}$/.test(zip);
}

/**
 * Валидация полного адреса
 */
export function validateAddress(address: Partial<Address>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!address.name || address.name.trim().length === 0) {
    errors.name = 'Укажите название адреса';
  }

  if (!address.address || address.address.trim().length < 5) {
    errors.address = 'Адрес должен содержать минимум 5 символов';
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'Укажите город';
  }

  if (!address.zip || !validateZipCode(address.zip)) {
    errors.zip = 'Укажите корректный почтовый индекс (6 цифр)';
  }

  if (!address.type) {
    errors.type = 'Выберите тип адреса';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
