import type { LegBalance } from '@/types/matrix';

/**
 * Конвертировать PV (Point Value) в читаемый формат
 */
export function formatPV(pv: string | number): string {
  const value = typeof pv === 'string' ? parseFloat(pv) : pv;
  if (isNaN(value)) return '0';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

/**
 * Вычислить баланс ног (для бинарных бонусов)
 */
export function calculateLegBalance(leftVolume: string, rightVolume: string): LegBalance {
  const left = parseFloat(leftVolume || '0');
  const right = parseFloat(rightVolume || '0');
  const total = left + right;
  const difference = Math.abs(left - right);

  let balancePercent = 0;
  if (total > 0) {
    const minLeg = Math.min(left, right);
    const maxLeg = Math.max(left, right);
    balancePercent = maxLeg > 0 ? (minLeg / maxLeg) * 100 : 0;
  }

  let strongerLeg: 'left' | 'right' | 'balanced' = 'balanced';
  if (difference > 0.01) {
    strongerLeg = left > right ? 'left' : 'right';
  }

  return {
    left,
    right,
    total,
    difference,
    balancePercent,
    strongerLeg,
  };
}

/**
 * Определить какая нога "сильнее"
 */
export function getStrongerLeg(leftVolume: string, rightVolume: string): 'left' | 'right' | 'balanced' {
  const left = parseFloat(leftVolume || '0');
  const right = parseFloat(rightVolume || '0');

  if (Math.abs(left - right) < 0.01) return 'balanced';
  return left > right ? 'left' : 'right';
}

/**
 * Вычислить процент заполнения ноги от целевого значения
 */
export function calculateLegProgress(legVolume: string, targetVolume: number): number {
  const volume = parseFloat(legVolume || '0');
  if (targetVolume <= 0) return 0;
  return Math.min((volume / targetVolume) * 100, 100);
}

/**
 * Форматировать число в компактный формат (1K, 1M и т.д.)
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}
