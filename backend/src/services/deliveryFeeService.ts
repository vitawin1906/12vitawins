// backend/src/services/deliveryFeeService.ts
import { settlementSettingsRuntime } from '#config/settlementSettings';

export interface DeliveryFeeParams {
    deliveryService?: 'sdek' | 'russianpost' | 'yandex' | null;
    deliveryAddress?: string | null;
    cartSubtotalRub: number;
    weight?: number; // kg
    volume?: number; // cm³
}

export interface DeliveryFeeResult {
    feeRub: number;
    isFree: boolean;
    reason: string;
}

/**
 * Сервис расчета стоимости доставки на сервере
 * - Проверяет free shipping threshold из settlementSettings
 * - Возвращает базовую стоимость доставки или 0 если доставка бесплатная
 */
export const deliveryFeeService = {
    /**
     * Рассчитать стоимость доставки
     */
    async calculateFee(params: DeliveryFeeParams): Promise<DeliveryFeeResult> {
        // 1. Если доставка не требуется
        if (!params.deliveryService || !params.deliveryAddress) {
            return {
                feeRub: 0,
                isFree: true,
                reason: 'Delivery not required',
            };
        }

        // 2. Получить настройки доставки из runtime config
        const freeShippingThreshold = settlementSettingsRuntime.freeShippingThresholdRub;
        const baseDeliveryFee = settlementSettingsRuntime.deliveryBasePriceRub;

        // 3. Проверить free shipping threshold
        if (params.cartSubtotalRub >= freeShippingThreshold) {
            return {
                feeRub: 0,
                isFree: true,
                reason: `Free shipping for orders ≥ ${freeShippingThreshold} RUB`,
            };
        }

        // 4. Расчет базовой стоимости
        let calculatedFee = baseDeliveryFee;

        // TODO: В будущем добавить интеграцию с API провайдеров
        // switch (params.deliveryService) {
        //     case 'sdek':
        //         calculatedFee = await this.calculateSDEKFee(params);
        //         break;
        //     case 'russianpost':
        //         calculatedFee = await this.calculateRussianPostFee(params);
        //         break;
        //     case 'yandex':
        //         calculatedFee = await this.calculateYandexFee(params);
        //         break;
        // }

        return {
            feeRub: calculatedFee,
            isFree: false,
            reason: `Base delivery fee for ${params.deliveryService}`,
        };
    },

    /**
     * Валидация параметров доставки
     */
    validateDeliveryParams(params: DeliveryFeeParams): string | null {
        if (params.deliveryService && !params.deliveryAddress) {
            return 'Delivery address is required when delivery service is specified';
        }

        if (params.cartSubtotalRub < 0) {
            return 'Cart subtotal must be non-negative';
        }

        if (params.weight && params.weight < 0) {
            return 'Weight must be non-negative';
        }

        if (params.volume && params.volume < 0) {
            return 'Volume must be non-negative';
        }

        return null;
    },

    // Placeholder методы для будущей интеграции
    // async calculateSDEKFee(params: DeliveryFeeParams): Promise<number> {
    //     // TODO: SDEK API integration
    //     return 500;
    // },
    //
    // async calculateRussianPostFee(params: DeliveryFeeParams): Promise<number> {
    //     // TODO: Russian Post API integration
    //     return 400;
    // },
    //
    // async calculateYandexFee(params: DeliveryFeeParams): Promise<number> {
    //     // TODO: Yandex Delivery API integration
    //     return 450;
    // },
};
