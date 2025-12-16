
import { useState } from 'react';
import { Heart, Share2, ShoppingCart, Shield, TruckIcon, Star, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductCalculations } from '@/utils/productCalculations';
import { ProductBonusesDetailed } from '../ProductBonuses';
import { useAuthStore } from '@/stores';
import { useUpdateCartMutation } from '@/store/api/domains/cartApi';

import type { Product } from '@/store/api/domains/productsApi';
import {useNavigate} from "react-router-dom";

interface ProductInfoProps {
    product: Product & {
        id: string;
        name: string;
        price: number;
        image?: string;
        slug?: string;
        benefits?: string[];
    };
    onAddToCart: () => void;
}

const ProductInfo = ({ product, onAddToCart }: ProductInfoProps) => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuthStore();
    const [updateCart] = useUpdateCartMutation();
    const navigate = useNavigate();
    const calculations = useProductCalculations({
        price: product.price,
        originalPrice: product.originalPrice,
        customPv: product.customPv ?? null,
        customCashback: product.customCashback ?? null,
    });

    const handleBuyNow = async () => {
        if (isLoading) return;

        // ✅ Проверка авторизации
        if (!user) {
            toast({
                title: "Требуется авторизация",
                description: "Войдите в аккаунт для покупки",
                variant: "destructive"
            });
            navigate('/login');
            return;
        }

        setIsLoading(true);

        try {
            // ✅ Отправляем товар на бэкенд через RTK Query
            await updateCart({
                action: 'add',
                product_id: product.id,
                quantity: 1,
            }).unwrap();

            toast({
                title: "Товар добавлен",
                description: "Переход к оформлению заказа",
            });

            navigate('/checkout');
        } catch (error: any) {
            toast({
                title: "Ошибка",
                description: error?.data?.message || "Не удалось добавить товар в корзину",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product.name,
                text: product.description,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Ссылка скопирована" });
        }
    };


  return (
    <div className="flex flex-col space-y-4 lg:space-y-6">
      <div className="flex flex-col space-y-3 lg:space-y-4">
        {/* Header with badges - mobile optimized */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
          <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-sm font-medium w-fit">
            {product.badge}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Bonus badges - responsive layout */}
            <div className="flex flex-wrap gap-2">
              <div className="text-white text-xs px-2 py-1 rounded-lg font-medium bg-[#e6c332]" style={{ backgroundColor: '#FF4081' }}>
                <Coins className="h-3 w-3 mr-1 inline" />
                +{calculations.bonusCoins} монет
              </div>

            </div>
            <div className="flex items-center space-x-2">
              <button
                className={`rounded-full p-2 border ${isFavorite ? 'text-red-500 border-red-200' : 'text-gray-400 border-gray-200'}`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`h-4 w-4 lg:h-5 lg:w-5 ${isFavorite ? 'fill-red-500' : ''}`} />
              </button>
              <button
                className="rounded-full p-2 border border-gray-200 text-gray-400"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 lg:h-5 lg:w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product name */}
        <h1 className="text-xl lg:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

        {/* Price section - mobile optimized */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-2xl lg:text-3xl font-bold text-gray-900">{calculations.formattedPrice}</span>
          {calculations.hasDiscount && (
            <>
              <span className="text-lg lg:text-xl text-gray-500 line-through">
                {calculations.formattedOriginalPrice}
              </span>
              <div className="text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded text-sm font-medium">
                -{calculations.discountPercentage}%
              </div>
            </>
          )}
        </div>

        {/* Rating - temporary static data */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-900">4.8</span>
          <span className="text-sm text-gray-500">(247 отзывов)</span>
        </div>

        {/* Description */}
        <p className="text-gray-600">{product.description}</p>

        {/* PV и Кешбэк информация */}
        <ProductBonusesDetailed
          price={product.price}
          showDetails={true}
          className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4"
        />
      </div>
      {/* Benefits */}
      <div className="bg-emerald-50 rounded-xl p-4 flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-gray-900">Гарантия качества</span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-gray-900">Гарантия качества</span>
        </div>
        <div className="flex items-center space-x-2">
          <TruckIcon className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-gray-900">Бесплатная доставка при заказе от 5000 ₽</span>
        </div>
      </div>
      {/* Buttons - показываем над характеристиками на мобильной версии */}
      <div className="lg:hidden grid grid-cols-2 gap-3">
        <button
          onClick={handleBuyNow}
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl h-12 flex items-center justify-center font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Добавление...
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Купить сейчас
            </>
          )}
        </button>
        <button
          onClick={onAddToCart}
          className="border-emerald-600 border text-emerald-600 hover:bg-emerald-50 rounded-xl h-12 flex items-center justify-center font-medium transition-colors"
        >
          В корзину
        </button>
      </div>
      {/* Product Characteristics Table */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Характеристики товара</h3>

        <div className="space-y-3">
          {product.sku && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Артикул</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.sku}</span>
            </div>
          )}

          {product.category && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Категория</span>
              <span className="text-right text-gray-900 text-sm font-medium">
                {typeof product.category === 'string' ? product.category : product.category?.name || ''}
              </span>
            </div>
          )}

          {product.capsuleCount && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Количество капсул</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.capsuleCount} шт.</span>
            </div>
          )}

          {product.capsuleVolume && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Объем капсулы</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.capsuleVolume}</span>
            </div>
          )}

          {product.servingsPerContainer && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Порций в упаковке</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.servingsPerContainer}</span>
            </div>
          )}

          {product.composition && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Состав</span>
              <span className="text-right text-gray-900 text-sm font-medium">
                {typeof product.composition === 'string'
                  ? product.composition
                  : JSON.stringify(product.composition)}
              </span>
            </div>
          )}

          {product.manufacturer && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Производитель</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.manufacturer}</span>
            </div>
          )}

          {product.countryOfOrigin && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Страна производства</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.countryOfOrigin}</span>
            </div>
          )}

          {product.expirationDate && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Срок годности</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.expirationDate}</span>
            </div>
          )}

          {product.storageConditions && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-700 text-sm">Условия хранения</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.storageConditions}</span>
            </div>
          )}

          {product.usage && (
            <div className="flex justify-between">
              <span className="text-gray-700 text-sm">Как принимать:</span>
              <span className="text-right text-gray-900 text-sm font-medium">{product.usage}</span>
            </div>
          )}
        </div>

        {/* Benefits tags */}
        {product.benefits && product.benefits.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-gray-200">
            <span className="text-sm text-gray-700 mb-2 w-full">Польза:</span>
            {product.benefits.map((benefit, index) => (
              <div
                key={index}
                className="text-xs bg-white border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full"
              >
                {benefit}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Buttons - показываем после характеристик на десктопной версии */}
      <div className="hidden lg:grid grid-cols-2 gap-3 pt-4">
        <button
          onClick={handleBuyNow}
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl h-12 flex items-center justify-center font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Добавление...
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Купить сейчас
            </>
          )}
        </button>
        <button
          onClick={onAddToCart}
          className="border-emerald-600 border text-emerald-600 hover:bg-emerald-50 rounded-xl h-12 flex items-center justify-center font-medium transition-colors"
        >
          В корзину
        </button>
      </div>
    </div>
  );
};

export default ProductInfo;