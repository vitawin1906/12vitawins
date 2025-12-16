// ВНИМАНИЕ: ЭТИ НАСТРОЙКИ ЗАФИКСИРОВАНЫ НАВСЕГДА И НЕ ДОЛЖНЫ ИЗМЕНЯТЬСЯ
// REFERRAL SYSTEM CONSTANTS - PERMANENTLY HARDCODED
// Система реферальных кодов - постоянные настройки

/**
 * ПОСТОЯННЫЕ НАСТРОЙКИ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * ЭТИ ЗНАЧЕНИЯ НИКОГДА НЕ ДОЛЖНЫ ИЗМЕНЯТЬСЯ
 */
export const REFERRAL_CONSTANTS = {
  // Скидка по реферальному коду - ВСЕГДА 10%
  DISCOUNT_PERCENTAGE: 10,
  
  // Бонусные коэффициенты - ФИКСИРОВАННЫЕ ЗНАЧЕНИЯ
  BONUS_COINS_PERCENTAGE: 5, // 5% от суммы заказа в бонусные монеты
  
  // Реферальные бонусы по уровням - ПОСТОЯННЫЕ ЗНАЧЕНИЯ  
  REFERRAL_LEVEL_1_PERCENTAGE: 20, // 20% с заказов рефералов 1-го уровня
  REFERRAL_LEVEL_2_PERCENTAGE: 5,  // 5% с заказов рефералов 2-го уровня
  REFERRAL_LEVEL_3_PERCENTAGE: 1,  // 1% с заказов рефералов 3-го уровня
  
  // Настройки привязки кодов - НЕИЗМЕНЯЕМЫЕ
  PERMANENT_CODE_BINDING: true, // Коды привязываются навсегда
  ALLOW_CODE_CHANGE: false, // Запрет смены кода после привязки
  
  // Валидация кодов - ПОСТОЯННЫЕ ПРАВИЛА
  SELF_REFERRAL_ALLOWED: false, // Запрет собственных кодов
  CASE_SENSITIVE: false, // Коды не чувствительны к регистру
  
  // Применение скидки - ФИКСИРОВАННАЯ ЛОГИКА
  DISCOUNT_ON_FIRST_USE: true, // Скидка при первом применении
  DISCOUNT_ON_BOUND_CODE: true, // Скидка при использовании привязанного кода
  
  // Сообщения ошибок - ПОСТОЯННЫЕ ТЕКСТЫ
  ERROR_MESSAGES: {
    INVALID_CODE: "Неверный реферальный код",
    SELF_REFERRAL: "Нельзя использовать собственный промокод", 
    CODE_ALREADY_BOUND: "Реферальный код уже привязан",
    CODE_NOT_FOUND: "Введенный реферальный код не найден"
  }
} as const;

/**
 * ВАЛИДАЦИЯ РЕФЕРАЛЬНОГО КОДА
 * ПОСТОЯННАЯ ЛОГИКА - НЕ ИЗМЕНЯТЬ
 */
export function validateReferralCode(code: string, userId: string, referrerId: string | null): {
  isValid: boolean;
  error?: string;
} {
  // Проверка на пустой код
  if (!code || code.trim() === '') {
    return { isValid: false, error: REFERRAL_CONSTANTS.ERROR_MESSAGES.INVALID_CODE };
  }

  // Проверка на собственный код
  if (referrerId === userId) {
    return { isValid: false, error: REFERRAL_CONSTANTS.ERROR_MESSAGES.SELF_REFERRAL };
  }

  // Код валиден
  return { isValid: true };
}

/**
 * РАСЧЕТ СКИДКИ ПО РЕФЕРАЛЬНОМУ КОДУ
 * ПОСТОЯННАЯ ФОРМУЛА - НЕ ИЗМЕНЯТЬ
 */
export function calculateReferralDiscount(subtotal: number): number {
  return Math.round(subtotal * (REFERRAL_CONSTANTS.DISCOUNT_PERCENTAGE / 100));
}

/**
 * РАСЧЕТ БОНУСНЫХ МОНЕТ (5% от заказа)
 * ПОСТОЯННАЯ ФОРМУЛА - НЕ ИЗМЕНЯТЬ  
 */
export function calculateBonusCoins(orderAmount: number): number {
  return Math.round(orderAmount * (REFERRAL_CONSTANTS.BONUS_COINS_PERCENTAGE / 100));
}

/**
 * РАСЧЕТ РЕФЕРАЛЬНЫХ НАГРАД ПО УРОВНЯМ
 * ПОСТОЯННАЯ ФОРМУЛА - НЕ ИЗМЕНЯТЬ
 */
export function calculateReferralReward(orderAmount: number, level: number): number {
  switch (level) {
    case 1:
      return Math.round(orderAmount * (REFERRAL_CONSTANTS.REFERRAL_LEVEL_1_PERCENTAGE / 100));
    case 2:
      return Math.round(orderAmount * (REFERRAL_CONSTANTS.REFERRAL_LEVEL_2_PERCENTAGE / 100));
    case 3:
      return Math.round(orderAmount * (REFERRAL_CONSTANTS.REFERRAL_LEVEL_3_PERCENTAGE / 100));
    default:
      return 0;
  }
}

/**
 * ЗАБЛОКИРОВАННЫЕ НАСТРОЙКИ - НЕ ИЗМЕНЯТЬ
 * Эти значения зафиксированы навсегда по запросу пользователя
 */
export const LOCKED_REFERRAL_SETTINGS = {
  // СКИДКА ВСЕГДА 10% - ЗАХАРДКОЖЕНО
  DISCOUNT_RATE: 0.10,
  
  // БОНУСНЫЕ МОНЕТЫ 5% ОТ ЗАКАЗА - ЗАХАРДКОЖЕНО  
  BONUS_COINS_RATE: 0.05,
  
  // РЕФЕРАЛЬНЫЕ НАГРАДЫ ПО УРОВНЯМ - ЗАХАРДКОЖЕНО
  REFERRAL_LEVEL_1_RATE: 0.20, // 20%
  REFERRAL_LEVEL_2_RATE: 0.05, // 5%
  REFERRAL_LEVEL_3_RATE: 0.01, // 1%
  
  // ПОСТОЯННАЯ ПРИВЯЗКА КОДОВ - ЗАХАРДКОЖЕНО
  PERMANENT_BINDING: true,
  
  // ЗАПРЕТ СМЕНЫ КОДА - ЗАХАРДКОЖЕНО
  NO_CODE_CHANGE: true,
  
  // СООБЩЕНИЯ ОШИБОК - ЗАХАРДКОЖЕНО
  ERRORS: {
    SELF_USE: "Нельзя использовать собственный промокод",
    ALREADY_APPLIED: "Реферальный код уже привязан", 
    INVALID_CODE: "Неверный реферальный код",
    NOT_FOUND: "Введенный реферальный код не найден"
  }
} as const;