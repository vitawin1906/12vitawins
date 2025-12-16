import { Coins, Gift } from "lucide-react";
import {getBonusInfo} from "@/utils/bonuses";
import {getPVInfo} from "@/utils/pv";

interface ProductBonusesProps {
  price: number;
  customPV?: number | null;        // абсолютное значение PV
  customCashback?: number | null;  // ДОЛЯ 0..1 (0.05 = 5%)
  className?: string;
}

/**
 * Компонент для отображения бонусов на карточке товара
 * Показывает два РАЗНЫХ бонуса:
 * 1. PV (Personal Volume) - баллы для MLM системы (синий бейдж)
 * 2. Кэшбек в рублях / монеты VitaWin Coin (розовый бейдж)
 */
export function ProductBonuses({ price, customPV, customCashback, className = "" }: ProductBonusesProps) {
  const pvInfo = getPVInfo(price, customPV);
  const bonusInfo = getBonusInfo(price, customCashback);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* PV Badge - синий (#4070ff) */}
      <div className="inline-flex items-center gap-1 px-2 py-1 text-white rounded-full text-xs font-medium shadow-sm" style={{ backgroundColor: '#4070ff' }}>
        <Coins className="w-3 h-3" />
        <span>+{pvInfo.pv} PV</span>
      </div>

      {/* Кэшбек Badge - розовый (#FF4081) */}
      <div className="inline-flex items-center gap-1 px-2 py-1 text-white rounded-full text-xs font-medium shadow-sm" style={{ backgroundColor: '#FF4081' }}>
        <Gift className="w-3 h-3" />
        <span>+{bonusInfo.cashback} ₽</span>
      </div>
    </div>
  );
}

interface ProductBonusesDetailedProps {
  price: number;
  customPV?: number | null;
  customCashback?: number | null;
  showDetails?: boolean;
  className?: string;
}

/**
 * Детальное отображение бонусов для страницы товара
 */
export function ProductBonusesDetailed({
  price,
  customPV,
  customCashback,
  showDetails = false,
  className = ""
}: ProductBonusesDetailedProps) {
  const pvInfo = getPVInfo(price, customPV);
  const bonusInfo = getBonusInfo(price, customCashback);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {/* PV Badge - синий */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-full text-sm font-medium" style={{ backgroundColor: '#4070ff' }}>
          <Coins className="w-4 h-4" />
          <span>+{pvInfo.pv} PV</span>
        </div>

        {/* Кэшбек Badge - розовый */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-full text-sm font-medium" style={{ backgroundColor: '#FF4081' }}>
          <Gift className="w-4 h-4" />
          <span>+{bonusInfo.cashback} ₽</span>
        </div>
      </div>

      {showDetails && (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>PV (Personal Volume):</span>
            <span className="font-medium">{pvInfo.pv} PV</span>
          </div>
          <div className="flex justify-between">
            <span>Кешбэк VitaWin Coin ({bonusInfo.cashbackPercent}%):</span>
            <span className="font-medium">{bonusInfo.cashback} ₽</span>
          </div>
          <div className="flex justify-between">
            <span>Монет начислится:</span>
            <span className="font-medium">{bonusInfo.coins} монет</span>
          </div>

          {pvInfo.remainingForNextPV > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-500 pt-1 border-t">
              До следующего PV: {pvInfo.remainingForNextPV} ₽
            </div>
          )}
        </div>
      )}
    </div>
  );
}
