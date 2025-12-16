/**
 * PV (Personal Volume) calculation utilities
 * 1 PV = 200 рублей потраченных
 * 1 PV = 100 рублей при расчётах в MLM-сети
 */

/**
 * Рассчитывает количество PV для суммы покупки
 * @param amount - сумма покупки в рублях
 * @param customPV - ручное значение PV (если задано)
 * @returns количество PV (округление вниз)
 */
export function calculatePV(amount: number, customPV?: number | null): number {
  if (amount <= 0) return 0;
  if (customPV !== null && customPV !== undefined) return customPV;
  return Math.floor(amount / 200);
}

/**
 * Рассчитывает эквивалент PV в рублях для MLM расчётов
 * @param pv - количество PV
 * @returns сумма в рублях (1 PV = 100 рублей)
 */
export function pvToRubles(pv: number): number {
  return pv * 100;
}

/**
 * Рассчитывает минимальную сумму для получения определённого количества PV
 * @param pv - желаемое количество PV
 * @returns минимальная сумма в рублях
 */
export function pvToMinAmount(pv: number): number {
  return pv * 200;
}

/**
 * Получает информацию о PV для суммы
 * @param amount - сумма покупки в рублях
 * @param customPV - ручное значение PV (если задано)
 * @returns объект с информацией о PV
 */
export function getPVInfo(amount: number, customPV?: number | null) {
  const pv = calculatePV(amount, customPV);
  const mlmValue = pvToRubles(pv);
  const nextPVAt = customPV ? null : pvToMinAmount(pv + 1);
  const remainingForNextPV = nextPVAt ? nextPVAt - amount : 0;
  
  return {
    pv,
    mlmValue,
    nextPVAt,
    remainingForNextPV: remainingForNextPV > 0 ? remainingForNextPV : 0,
    isCustom: customPV !== null && customPV !== undefined
  };
}