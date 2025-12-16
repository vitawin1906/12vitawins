
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart, Plus, Coins, Gift, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useCartStore } from '@/stores';
import { useToast } from '@/hooks/use-toast';
import { useGetPublicProductsQuery, type Product as ApiProduct } from '@/store/api/domains';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  images?: string[];
  image?: string;
  category?: string;
  slug?: string;
}

interface BlogProductRecommendationProps {
  category?: string;
  title?: string;
  maxProducts?: number;
}

const BlogProductRecommendation = ({
  category,
  title = "Рекомендуемые продукты",
  maxProducts = 3
}: BlogProductRecommendationProps) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const addToCart = useCartStore(state => state.addItem);
  const { toast } = useToast();

  // ✅ RTK Query - загружаем все товары
  const { data: allProducts = [], isLoading: loading } = useGetPublicProductsQuery({ limit: 100 });

  // ✅ Фильтруем товары через useMemo
  const products = useMemo(() => {
    let filtered = allProducts;

    if (category) {
      // Определяем slug категории из разных форматов
      const getCategorySlug = (p: ApiProduct) => {
        if (typeof p.category === 'object' && p.category !== null) {
          return p.category.slug;
        }
        return p.category;
      };

      const categoryProducts = filtered.filter(p => getCategorySlug(p) === category);

      if (categoryProducts.length < maxProducts) {
        const remaining = maxProducts - categoryProducts.length;
        const others = filtered
          .filter(p => getCategorySlug(p) !== category)
          .slice(0, remaining);
        filtered = [...categoryProducts, ...others];
      } else {
        filtered = categoryProducts;
      }
    }

    return filtered.slice(0, maxProducts);
  }, [allProducts, category, maxProducts]);

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

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Бестселлер": return "bg-emerald-500";
      case "Премиум": return "bg-purple-500";
      case "Популярный": return "bg-blue-500";
      case "Выгодно": return "bg-orange-500";
      case "Рекомендовано врачами": return "bg-red-500";
      case "Новинка": return "bg-pink-500";
      default: return "bg-gray-500";
    }
  };

  const getBonusCoins = (price: number) => Math.round(price * 0.05);
  const getCashback = (price: number) => Math.round(price * 0.02);
  const getDiscountPercentage = (originalPrice: number, price: number) => 
    Math.round(((originalPrice - price) / originalPrice) * 100);

  if (loading) {
    return (
      <div className="my-8 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(maxProducts)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if ((products || []).length === 0) {
    return null;
  }

  return (
    <div className="my-8 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-100">
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(products || []).map((product) => (
          <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden h-full flex flex-col">
            <div className="relative">
              <Link to={`/product/${product.slug || product.id}`}>
                <div 
                  className="overflow-hidden bg-gray-50"
                  style={{ width: '100%', height: '400px' }}
                >
                  <img
                    src={
                      Array.isArray((product as any).images) && (product as any).images.length > 0
                        ? (product as any).images[0].mediaId || (product as any).images[0]
                        : (product as any).image || '/placeholder.svg'
                    }
                    alt={product.name}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              
              {product.badge && (
                <Badge 
                  className={`absolute top-3 left-3 text-white text-xs ${getBadgeColor(product.badge)}`}
                >
                  {product.badge}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 bg-white/80 hover:bg-white p-2"
                onClick={() => toggleFavorite(product.id)}
              >
                <Heart 
                  className={`h-4 w-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
                />
              </Button>

              <div className="absolute bottom-3 right-3 flex flex-col space-y-1">
                <Badge className="text-white text-xs" style={{ backgroundColor: '#FF4081' }}>
                  <Coins className="h-3 w-3 mr-1" />
                  +{getBonusCoins(product.price)} монет
                </Badge>
                <Badge className="bg-blue-500 text-white text-xs">
                  <Gift className="h-3 w-3 mr-1" />
                  {getCashback(product.price)} ₽ кэшбек
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 flex flex-col flex-grow">
              <div className="space-y-3 flex-grow">
                <div>
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {product.categoryId}
                  </Badge>
                  <h4 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">
                    <Link to={`/product/${product.slug || product.id}`}>{product.name}</Link>
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(product.rating || 4.5)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{product.rating || 4.5}</span>
                  <span className="text-sm text-gray-500">({product.reviews || 0} отзывов)</span>
                </div>
              </div>

              <div className="space-y-3 mt-auto">
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-gray-900">{product.price.toLocaleString()} ₽</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <>
                      <span className="text-sm text-gray-500 line-through">{product.originalPrice.toLocaleString()} ₽</span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                        -{getDiscountPercentage(product.originalPrice, product.price)}%
                      </Badge>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                    asChild
                  >
                    <Link to={`/product/${product.slug || product.id}`}>
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Купить сейчас
                    </Link>
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 text-sm"
                    onClick={() => handleAddToCart(product)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    В корзину
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BlogProductRecommendation;
