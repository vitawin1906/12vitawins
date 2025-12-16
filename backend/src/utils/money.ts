// src/utils/money.ts
/**
 * Денежные и PV утилиты VitaWins
 * Работают с runtime-параметрами settlementSettingsRuntime
 */
import { settlementSettingsRuntime } from '#config/settlementSettings';

/** Округление "half_up" (0.5 всегда вверх) */
export function roundHalfUp(value: number, digits = 2): number {
    const factor = 10 ** digits;
    return Math.sign(value) * Math.floor(Math.abs(value) * factor + 0.5) / factor;
}

/** Округление PV вниз (floor) */
export function roundPv(value: number): number {
    return Math.floor(value);
}

/** Преобразование PV → RUB */
export function pvToRub(pv: number): number {
    return roundHalfUp(pv * settlementSettingsRuntime.pvRubPerPv, 2);
}

/** Преобразование RUB → PV (округляем вниз) */
export function rubToPv(rub: number): number {
    return roundPv(rub / settlementSettingsRuntime.pvRubPerPv);
}

/** Применить процент (например, 10%) */
export function applyPercent(amount: number, percent: number): number {
    return roundHalfUp(amount * (percent / 100), 2);
}

/** Вычесть процент (например, -10%) */
export function subtractPercent(amount: number, percent: number): number {
    return roundHalfUp(amount - amount * (percent / 100), 2);
}

/** Отформатировать число в фиксированную денежную строку */
export function toDecimal(value: number, digits = 2): string {
    return roundHalfUp(value, digits).toFixed(digits);
}

/** Проверить, достигнут ли порог бесплатной доставки */
export function isFreeShipping(amountRub: number): boolean {
    return amountRub >= settlementSettingsRuntime.freeShippingThresholdRub;
}
