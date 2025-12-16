
import { Progress } from '@/components/ui/progress';
import { Truck } from 'lucide-react';
import { formatPrice } from '@/utils/priceUtils';
import { DELIVERY_CONFIG } from '@/config/checkoutConfig';

interface FreeShippingProgressProps {
  currentAmount: number;
  freeShippingThreshold?: number;
  className?: string;
}

const FreeShippingProgress = ({ 
  currentAmount, 
  freeShippingThreshold = DELIVERY_CONFIG.freeShippingThreshold,
  className = "" 
}: FreeShippingProgressProps) => {
  // ХАРДКОД НАСТРОЙКИ ДОСТАВКИ
  const threshold = DELIVERY_CONFIG.freeShippingThreshold;
  const progress = Math.min((currentAmount / threshold) * 100, 100);
  const remaining = Math.max(threshold - currentAmount, 0);
  const isEligible = currentAmount >= threshold;

  return (
    <div className={`bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-lg border ${className}`}>
      <div className="flex items-center mb-3">
        <Truck className="h-5 w-5 text-emerald-600 mr-2" />
        <span className="font-medium text-gray-900">
          {isEligible ? 'Бесплатная доставка!' : 'Прогресс до бесплатной доставки'}
        </span>
      </div>
      
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {formatPrice(currentAmount)}
          </span>
          <span className="text-gray-600">
            {formatPrice(threshold)}
          </span>
        </div>
      </div>
      
      {!isEligible && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-700">
            Добавьте товаров еще на{' '}
            <span className="font-semibold text-emerald-600">
              {formatPrice(remaining)}
            </span>{' '}
            для бесплатной доставки
          </p>
        </div>
      )}
      
      {isEligible && (
        <div className="mt-3 text-center">
          <p className="text-sm font-medium text-emerald-700">
            ✓ Вы получили бесплатную доставку!
          </p>
        </div>
      )}
    </div>
  );
};

export default FreeShippingProgress;
