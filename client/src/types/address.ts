// client/src/types/address.ts

/**
 * Address Types
 * Соответствуют backend/src/db/schema/addresses.ts
 */

/* ======================== Enums ======================== */

export type AddressType = 'home' | 'work';

/* ======================== Interfaces ======================== */

/**
 * Address - Адрес доставки пользователя
 */
export interface Address {
  id: string; // UUID
  userId: string; // UUID FK → app_user.id
  name: string; // Название адреса (например "Дом", "Офис")
  address: string; // Улица, дом, квартира
  city: string; // Город
  state?: string | null; // Область/регион (опционально)
  zip: string; // Почтовый индекс
  country: string; // Страна (по умолчанию "Россия")
  type: AddressType; // 'home' | 'work'
  isDefault: boolean; // Адрес по умолчанию
  createdAt: string;
  updatedAt: string;
}

/* ======================== DTO Types ======================== */

/**
 * CreateAddressDto - данные для создания адреса
 */
export interface CreateAddressDto {
  name: string;
  address: string;
  city: string;
  state?: string;
  zip: string;
  country?: string; // По умолчанию "Россия"
  type: AddressType;
  isDefault?: boolean; // По умолчанию false
}

/**
 * UpdateAddressDto - данные для обновления адреса
 */
export interface UpdateAddressDto {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  type?: AddressType;
  isDefault?: boolean;
}

/* ======================== Response Types ======================== */

export interface AddressesResponse {
  success: boolean;
  addresses: Address[];
}

export interface AddressResponse {
  success: boolean;
  address: Address;
}
