/**
 * Хардкод настройки для чекаута и связанных компонентов
 */

export const CHECKOUT_CONFIG = {
  // Настройки доставки
  delivery: {
    freeShippingThreshold: 5000, // Бесплатная доставка от 5000 ₽
    standardDeliveryFee: 300,    // Стандартная доставка 300 ₽
    expressDeliveryFee: 500,     // Экспресс доставка 500 ₽
    pickupFee: 0,               // Самовывоз бесплатно
  },

  // Настройки налогов и комиссий
  fees: {
    taxRate: 0,                 // Налог 0% (убираем налог)
    processingFee: 0,           // Комиссия за обработку 0 ₽
  },

  // Настройки бонусной системы
  bonuses: {
    bonusRate: 0.05,            // 5% бонусов от суммы заказа
    minBonusAmount: 1,          // Минимум 1 ₽ бонусов
  },

  // Настройки промокодов
  promos: {
    referralDiscountRate: 0.10, // 10% скидка по реферальному коду
    maxReferralDiscount: 1000,  // Максимальная скидка 1000 ₽
  },

  // Способы оплаты
  paymentMethods: [
    {
      id: 'card',
      name: 'Банковская карта',
      description: 'Оплата через Тинькофф банк',
      icon: 'credit-card',
      enabled: true,
    },
    {
      id: 'cash',
      name: 'Наличными при получении',
      description: 'Оплата курьеру наличными',
      icon: 'banknote',
      enabled: true,
    },
    {
      id: 'balance',
      name: 'С баланса VitaWin',
      description: 'Списание с личного баланса',
      icon: 'wallet',
      enabled: true,
    },
  ],

  // Способы доставки
  deliveryMethods: [
    {
      id: 'courier',
      name: 'Курьерская доставка',
      description: 'Доставка по Москве и области',
      price: 300,
      enabled: true,
    },
    {
      id: 'pickup',
      name: 'Самовывоз',
      description: 'Забрать в пункте выдачи',
      price: 0,
      enabled: true,
    },
    {
      id: 'post',
      name: 'Почта России',
      description: 'Доставка по всей России',
      price: 400,
      enabled: true,
    },
  ],

  // Настройки формы
  form: {
    requiredFields: ['fullName', 'email', 'phone', 'address', 'city', 'postalCode'],
    phonePattern: /^\+7\s?\(\d{3}\)\s?\d{3}-\d{2}-\d{2}$/,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // Сообщения
  messages: {
    success: 'Заказ успешно оформлен!',
    error: 'Ошибка при оформлении заказа',
    validation: 'Заполните все обязательные поля',
    payment: 'Переход к оплате...',
  },
};

// Экспорт отдельных настроек для удобства
export const DELIVERY_CONFIG = CHECKOUT_CONFIG.delivery;
export const BONUS_CONFIG = CHECKOUT_CONFIG.bonuses;
export const PAYMENT_METHODS = CHECKOUT_CONFIG.paymentMethods;
export const DELIVERY_METHODS = CHECKOUT_CONFIG.deliveryMethods;