// client/src/components/FeaturedProducts.tsx

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/stores";
import { useToast } from "@/hooks/use-toast";
import { getMainProductImage } from "@/utils/imageUtils";
import {
    type Product,
} from "@/store/api/domains/productsApi";
import {useGetPublicProductsQuery} from "@/store/api/domains";
import ProductCard from "@/components/ProductCard";

const ProductSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Skeleton className="w-full h-64" />
        <div className="p-6">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-4" />
            <Skeleton className="h-6 w-1/3 mb-4" />
            <div className="flex space-x-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
            </div>
        </div>
    </div>
);

const FeaturedProducts = () => {
    // публичный список товаров
    const { data: products = [], isLoading } = useGetPublicProductsQuery({
        limit: 6,
    });

    const { addItem } = useCartStore();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleAddToCart = useCallback(
         (product: Product) => {
            if (!product) return;
            try {
                 addItem({
                    id: product.id,
                    name: product.name || product.title || "",
                    price: Number(product.price) || 0,
                    customPv: product.customPv ?? null,
                    customCashback: product.customCashback ?? null, // ДОЛЯ 0..1
                    slug: product.slug,
                    quantity: 1,
                    imageUrl: getMainProductImage(product),
                });

                toast({
                    title: "Товар добавлен в корзину!",
                    description: `${product.name || product.title} добавлен в корзину`,
                });
            } catch {
                toast({
                    title: "Ошибка",
                    description: "Не удалось добавить товар в корзину",
                    variant: "destructive",
                });
            }
        },
        [addItem, toast]
    );

    const handleBuyNow = useCallback(
        async (product: Product) => {
            try {
                 addItem({
                    id: product.id,
                    name: product.name || product.title || "",
                    price: Number(product.price) || 0,
                    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
                    customPv: product.customPv ?? null,
                    customCashback: product.customCashback ?? null, // ДОЛЯ 0..1
                    slug: product.slug,
                    quantity: 1,
                    imageUrl: getMainProductImage(product),
                });
                navigate("/checkout");
            } catch {
                toast({
                    title: "Ошибка",
                    description: "Не удалось добавить товар в корзину",
                    variant: "destructive",
                });
            }
        },
        [addItem, navigate, toast]
    );

    if (isLoading) {
        return (
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Рекомендуемые товары
                        </h2>
                        <p className="text-lg text-gray-600">
                            Лучшие предложения для вашего здоровья
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <ProductSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        Специально для вас
                    </h2>
                    <p className="text-lg text-gray-600">
                        Персональная подборка качественных добавок
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(products as Product[]).map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}                 // пробрасываем весь объект
                            onAddToCart={handleAddToCart}     // коллбеки принимают product
                            onBuyNow={handleBuyNow}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedProducts;
