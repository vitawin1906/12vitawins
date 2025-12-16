
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ShoppingCart, Plus, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useCartStore } from '@/stores';
import { useToast } from '@/hooks/use-toast';
import {Link, useNavigate} from 'react-router-dom';
import { calculateBonusCoins, calculateCashback } from "@/utils/productCalculations";
import { useGetPublicProductsQuery, type Product as ApiProduct } from '@/store/api/domains';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  images?: string[];
  image?: string;
  badge?: string;
  category?: string;
  slug?: string;
}

interface RelatedProductsProps {
  currentProductId?: string;
  currentCategory?: string;
  title?: string;
}

const RelatedProducts = ({
  currentProductId,
  currentCategory,
  title = "Похожие товары"
}: RelatedProductsProps) => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState<string[]>([]);
  const addToCart = useCartStore(state => state.addItem);
  const { toast } = useToast();

  // ✅ RTK Query - загружаем все товары
  const { data: allProducts = [], isLoading: loading } = useGetPublicProductsQuery({ limit: 100 });

  // ✅ Фильтруем похожие товары через useMemo
  const products = useMemo(() => {
    let filtered = allProducts.filter(p => p.id !== currentProductId);

    if (currentCategory) {
      // Определяем ID категории из разных форматов
      const getCategoryId = (p: ApiProduct) => {
        if (typeof p.category === 'object' && p.category !== null) {
          return p.category.id;
        }
        return p.categoryId;
      };

      const categoryProducts = filtered.filter(p => getCategoryId(p) === currentCategory);

      if (categoryProducts.length < 4) {
        const remaining = 4 - categoryProducts.length;
        const others = filtered
          .filter(p => getCategoryId(p) !== currentCategory)
          .slice(0, remaining);
        filtered = [...categoryProducts, ...others];
      } else {
        filtered = categoryProducts;
      }
    }

    return filtered.slice(0, 4);
  }, [allProducts, currentProductId, currentCategory]);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddToCart = (product: ApiProduct | Product) => {
    const images = (product as ApiProduct).images;
    const imageUrl = Array.isArray(images) && images.length > 0
      ? images[0].mediaId
      : (product as Product).image || '/placeholder.svg';

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl,
      quantity: 1
    });

    toast({
      title: "Добавлено в корзину",
      description: `${product.name} добавлен в вашу корзину.`,
    });
  };

  const handleBuyNow = (product: ApiProduct | Product) => {
    handleAddToCart(product);
    navigate('/checkout');
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Бестселлер": return "bg-emerald-500";
      case "Премиум": return "bg-purple-500";
      case "Популярный": return "bg-blue-500";
      case "Выгодно": return "bg-orange-500";
      case "Рекомендуем": return "bg-red-500";
      case "Новинка": return "bg-pink-500";
      default: return "bg-gray-500";
    }
  };

  const getDiscountPercentage = (originalPrice: number, price: number) => 
    Math.round(((originalPrice - price) / originalPrice) * 100);

  if (loading) {
    return (
      <section className="py-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          ))}
        </div>
      </section>
    );
  }

  if ((products || []).length === 0) {
    return null;
  }

  return (
    <section className="py-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {(products || []).map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md overflow-hidden h-full flex flex-col bg-white">
            <div className="relative">
              <Link to={`/product/${product.slug || product.id}`}>
                <div className="overflow-hidden bg-gray-50 aspect-square">
                  <img
                    src={
                      Array.isArray((product as any).images) && (product as any).images.length > 0
                        ? (product as any).images[0].mediaId || (product as any).images[0]
                        : (product as any).image || '/placeholder.svg'
                    }
                    alt={product.name}
                    className="w-full h-full object-contain p-2 sm:p-3 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              
              {/* Top badges */}
              {product.badge && (
                <Badge 
                  className={`absolute top-2 left-2 text-white text-xs ${getBadgeColor(product.badge)}`}
                >
                  {product.badge}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1.5 h-auto w-auto"
                onClick={() => toggleFavorite(product.id)}
              >
                <Heart 
                  className={`h-3 w-3 sm:h-4 sm:w-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
                />
              </Button>

              {/* Bottom bonus badges */}
              <div className="absolute bottom-2 right-2 flex flex-col space-y-1">
                <Badge className="text-white text-xs" style={{ backgroundColor: '#FF4081' }}>
                  <Coins className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5" />
                  +{calculateBonusCoins(product.price)}
                </Badge>
                <Badge className="bg-blue-500 text-white text-xs">
                  <Gift className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5" />
                  {calculateCashback(product.price)} ₽
                </Badge>
              </div>
            </div>

            <CardContent className="p-3 sm:p-4 flex flex-col flex-grow">
              <div className="space-y-2 flex-grow">
                <h3 className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                  <Link to={`/product/${product.slug || product.id}`}>{product.name}</Link>
                </h3>

                <div className="flex items-center space-x-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                          i < Math.floor(product.rating || 4.5)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">({product.reviews || 0})</span>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-1">
                  <span className="text-base sm:text-lg font-bold text-gray-900">{product.price.toLocaleString()} ₽</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <>
                      <span className="text-xs text-gray-500 line-through">{product.originalPrice.toLocaleString()} ₽</span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                        -{getDiscountPercentage(product.originalPrice, product.price)}%
                      </Badge>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <Button 
                    onClick={() => handleBuyNow(product)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    size="sm"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Купить
                  </Button>
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-xs h-8"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    В корзину
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;
