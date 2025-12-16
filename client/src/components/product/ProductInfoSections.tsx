import { Clock, CheckCircle, Heart, Info, Package, MapPin, Calendar, ThermometerSnowflake, Factory } from 'lucide-react';
import type { Product } from '@/store/api/domains/productsApi';

interface ProductInfoSectionsProps {
  product: Product;
}

const ProductInfoSections = ({ product }: ProductInfoSectionsProps) => {
  // Парсим composition если это JSON объект
  const compositionTable = (() => {
    if (!product.composition) return null;

    // Если уже массив
    if (Array.isArray(product.composition)) {
      return product.composition as { component: string; amount: string }[];
    }

    // Если объект - конвертируем в массив
    if (typeof product.composition === 'object') {
      return Object.entries(product.composition).map(([component, amount]) => ({
        component,
        amount: String(amount)
      }));
    }

    return null;
  })();

  // Проверяем наличие хотя бы одного поля для отображения
  const hasAnyContent = Boolean(
    product.usage ||
    product.additionalInfo ||
    compositionTable?.length ||
    product.capsuleCount ||
    product.capsuleVolume ||
    product.servingsPerContainer ||
    product.manufacturer ||
    product.countryOfOrigin ||
    product.expirationDate ||
    product.storageConditions
  );

  if (!hasAnyContent) {
    return null;
  }

  return (
    <div className="bg-white py-4 sm:py-8">
      <div className="w-full px-4 space-y-6 sm:space-y-8">

        {/* Основная информация о продукте */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* Характеристики продукта */}
          {(product.capsuleCount || product.capsuleVolume || product.servingsPerContainer) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Характеристики</h3>
              </div>
              <div className="space-y-3">
                {product.capsuleCount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Количество капсул:</span>
                    <span className="font-semibold text-gray-900">{product.capsuleCount} шт</span>
                  </div>
                )}
                {product.capsuleVolume && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Объем капсулы:</span>
                    <span className="font-semibold text-gray-900">{product.capsuleVolume}</span>
                  </div>
                )}
                {product.servingsPerContainer && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Порций в упаковке:</span>
                    <span className="font-semibold text-gray-900">{product.servingsPerContainer}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Производство */}
          {(product.manufacturer || product.countryOfOrigin) && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Factory className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Производство</h3>
              </div>
              <div className="space-y-3">
                {product.manufacturer && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-700 min-w-[100px]">Производитель:</span>
                    <span className="font-semibold text-gray-900">{product.manufacturer}</span>
                  </div>
                )}
                {product.countryOfOrigin && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-700">Страна производства:</span>
                      <span className="font-semibold text-gray-900 ml-2">{product.countryOfOrigin}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Состав */}
          {compositionTable && compositionTable.length > 0 && (
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-600" />
                <h3 className="text-lg font-semibold text-gray-900">Состав и пищевая ценность</h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="py-2 text-left text-sm font-semibold text-gray-700">Компонент</th>
                      <th className="py-2 text-right text-sm font-semibold text-gray-700">Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compositionTable.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 last:border-b-0">
                        <td className="py-2 text-sm text-gray-700">{item.component}</td>
                        <td className="py-2 text-sm text-right text-gray-900 font-semibold">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Применение */}
        {product.usage && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Способ применения</h3>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.usage}</p>
            </div>
          </div>
        )}

        {/* Дополнительная информация */}
        {product.additionalInfo && (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-gray-900">Дополнительная информация</h3>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.additionalInfo}</p>
            </div>
          </div>
        )}

        {/* Хранение и срок годности */}
        {(product.storageConditions || product.expirationDate) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.storageConditions && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ThermometerSnowflake className="h-5 w-5 text-cyan-600" />
                  <h4 className="text-base font-semibold text-gray-900">Условия хранения</h4>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{product.storageConditions}</p>
              </div>
            )}

            {product.expirationDate && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h4 className="text-base font-semibold text-gray-900">Срок годности</h4>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{product.expirationDate}</p>
              </div>
            )}
          </div>
        )}

        {/* Гарантии качества */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6" />
            <h3 className="text-xl font-bold">Гарантия качества</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Сертифицированное производство</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Контроль качества на всех этапах</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Натуральные компоненты</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Международные стандарты</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoSections;
