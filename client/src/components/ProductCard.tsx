// client/src/components/ProductCard.tsx

import { useState, memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/LazyImage";
import { getMainProductImage } from "@/utils/imageUtils";
import { useProductCalculations } from "@/utils/productCalculations";
import { ProductBonuses } from "./ProductBonuses";
import type { Product as ApiProduct } from "@/store/api/domains/productsApi"; // ← каноничный тип

import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores"; // следуем стилю BalanceSection / ReferralProgram
import {
    useGetCartPreviewQuery,
    useUpdateCartMutation,
} from "@/store/api/domains/cartApi";

type Product = ApiProduct;

interface ProductCardProps {
    product: Product;
    onAddToCart?: (product: Product) => void; // передаём целый продукт (опционально)
    onBuyNow?: (product: Product) => void; // передаём целый продукт (опционально)
}

function hashId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const ProductCard = memo(function ProductCard({
                                                  product,
                                                  onAddToCart,
                                                  onBuyNow,
                                              }: ProductCardProps) {
    const [isLiked, setIsLiked] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const { user, isHydrated } = useAuthStore();
    const shouldLoadCart = isHydrated && !!user;

    // Текущая корзина на сервере (preview), чтобы знать уже имеющееся количество
    const { data: cartPreview } = useGetCartPreviewQuery(undefined, {
        skip: !shouldLoadCart,
    });

    const [updateCart, { isLoading: isUpdating }] = useUpdateCartMutation();

    // Картинка из новой схемы {mediaId, role, sortOrder}
    const productImage = useMemo(() => {
        try {
            return getMainProductImage(product);
        } catch {
            return "/placeholder.svg";
        }
    }, [product]);

    const productUrl = useMemo(
        () => `/product/${product.slug || product.id}`,
        [product.slug, product.id]
    );

    // Расчёты: цена/старая цена (оригинальная) + бонусы с бэка
    const calculations = useProductCalculations({
        price: product.price,
        originalPrice: product.originalPrice,
        customPv: product.customPv ?? null,
        customCashback: product.customCashback ?? null,
    });

    // Используем рейтинг из API или fallback
    const rating = product.rating || 4.8;
    const reviewsCount = product.reviews || (736 + (hashId(product.id) % 500));
    const priceNumber = Number(product.price) || 0;

    /* --------------------------------
       Добавление в корзину
    -------------------------------- */
    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            // Не авторизован — ведём на логин
            navigate("/login");
            return;
        }

        try {
            // ✅ FIX-CART-2: Используем action: 'add' для прибавления +1
            await updateCart({
                action: "add",
                product_id: product.id,
                quantity: 1, // Прибавляет 1 к существующему количеству
            }).unwrap();

            toast({
                title: "Товар добавлен в корзину",
                description: `${product.title || product.name} добавлен в корзину`,
            });

            // Если родитель хочет ещё что-то сделать (например, открыть сайдбар-корзину)
            onAddToCart?.(product);
        } catch (err: any) {
            toast({
                title: "Ошибка",
                description:
                    err?.data?.message || "Не удалось добавить товар в корзину",
                variant: "destructive",
            });
        }
    };

    /* --------------------------------
       Купить сейчас
       (добавляем 1 шт и ведём в checkout)
    -------------------------------- */
    const handleBuyNow = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            navigate("/login");
            return;
        }

        try {
            // ✅ FIX-CART-2: Используем action: 'add' для прибавления +1
            await updateCart({
                action: "add",
                product_id: product.id,
                quantity: 1,
            }).unwrap();

            onBuyNow?.(product);
            navigate("/checkout");
        } catch (err: any) {
            toast({
                title: "Ошибка",
                description:
                    err?.data?.message || "Не удалось добавить товар для покупки",
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="group relative overflow-hidden bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            {product.badge && (
                <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-emerald-500 text-white px-2 py-1 text-xs font-semibold">
                        {product.badge}
                    </Badge>
                </div>
            )}

            <button
                onClick={(e) => {
                    e.preventDefault();
                    setIsLiked((v) => !v);
                }}
                className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
            >
                <Heart
                    className={`w-4 h-4 ${
                        isLiked ? "fill-red-500 text-red-500" : "text-gray-400"
                    }`}
                />
            </button>

            <Link to={productUrl} className="block">
                <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <LazyImage
                        src={productImage}
                        alt={product.title || product.name}
                        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                        aspectRatio="1/1"
                        loading="lazy"
                    />

                    {/* Бонусы: значения приходят с бэка (customPv/customCashback) */}
                    <ProductBonuses
                        price={priceNumber}
                        customPV={product.customPv ?? null}
                        customCashback={product.customCashback ?? null}
                        className="absolute bottom-3 right-3"
                    />
                </div>
            </Link>

            <div className="p-4 flex flex-col flex-grow">
                <div className="text-sm text-gray-500 mb-1">
                    {product.category?.name || "Без категории"}
                </div>

                <Link to={productUrl} className="block">
                    <h3 className="text-base md:text-lg font-bold text-emerald-600 mb-2 line-clamp-2 hover:text-emerald-700 transition-colors min-h-[2.5rem] md:min-h-[3.5rem] flex items-start leading-tight">
                        {product.title || product.name || "Товар"}
                    </h3>
                </Link>

                {product.description && (
                    <p className="hidden sm:block text-gray-600 text-sm mb-3 line-clamp-2 min-h-[2.5rem] flex items-start">
                        {product.description}
                    </p>
                )}

                <div className="flex items-center gap-1 mb-3 h-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-3 h-3 md:w-4 md:h-4 ${
                                star <= Math.floor(rating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                            }`}
                        />
                    ))}
                    <span className="font-semibold text-gray-800 ml-1 text-sm">
            {rating}
          </span>
                    <span className="text-gray-500 text-xs md:text-sm hidden sm:inline">
            ({reviewsCount} отзывов)
          </span>
                </div>

                <div className="flex-grow" />

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3">
          <span className="text-lg md:text-xl font-bold text-gray-900">
            {calculations.formattedPrice}
          </span>
                    {calculations.hasDiscount && (
                        <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm text-gray-400 line-through">
                {calculations.formattedOriginalPrice}
              </span>
                            {calculations.discountPercentage > 0 && (
                                <span className="text-xs md:text-sm text-emerald-600 font-semibold">
                  -{calculations.discountPercentage}%
                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-1 sm:gap-2">
                    <Button
                        onClick={handleBuyNow}
                        disabled={isUpdating}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                    >
                        <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Купить</span>
                        <span className="xs:hidden">₽</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleAddToCart}
                        disabled={isUpdating}
                        className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs sm:text-sm h-8 sm:h-9"
                    >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Корзина</span>
                    </Button>
                </div>
            </div>
        </Card>
    );
});

export { ProductCard };
export default ProductCard;
