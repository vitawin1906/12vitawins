import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import StoreSchema from '../components/StoreSchema';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useCartStore, useAuthStore } from '@/stores';
import { useToast } from '../hooks/use-toast';
import { useGetPublicProductsQuery, useGetPublicCategoriesQuery, type Category } from '@/store/api/domains';
import { useUpdateCartMutation } from '@/store/api/domains/cartApi';
import { getMainProductImage } from '@/utils/imageUtils';

const Store = () => {
    const navigate = useNavigate();

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('popular');

    // ✅ RTK Query hooks
    const { data: categories = [] } = useGetPublicCategoriesQuery();
    const { data: productsData, isLoading: loading } = useGetPublicProductsQuery({ limit: 100 });
    const allProducts = productsData || [];

    // ✅ FIX-CART-1: Conditional cart logic
    const { user, isHydrated } = useAuthStore();
    const addToCartLocal = useCartStore((state) => state.addItem);
    const [updateCart, { isLoading: isUpdating }] = useUpdateCartMutation();
    const { toast } = useToast();

    /** Быстрый lookup по ID */
    const catById = useMemo(
        () => Object.fromEntries(categories.map((c: Category) => [c.id, c])),
        [categories]
    );

    /** Скролл */
    const scrollToCategory = (id: string) => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    /** Определяем slug категории у продукта */
    const productCategorySlug = (p: any): string | undefined => {
        if (p?.category?.slug) return p.category.slug;
        if (p?.category_slug) return p.category_slug;
        if (p?.categoryId && catById[p.categoryId]) return catById[p.categoryId].slug;
        if (typeof p?.category === 'string') return p.category;
        return undefined;
    };

    /** Фильтрация + сортировка */
    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        let items = (allProducts || []).filter((product) => {
            if (!product) return false;

            const name = String(product.name || product.title || '').toLowerCase();
            const description = String(product.description || '').toLowerCase();

            const matchesSearch = !q || name.includes(q) || description.includes(q);

            const pCatSlug = productCategorySlug(product);
            const matchesCategory =
                selectedCategory === 'all' || pCatSlug === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        // создаём копию массива перед сортировкой
        const sorted = [...items];

        if (sortBy === 'price-low') {
            sorted.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (sortBy === 'price-high') {
            sorted.sort((a, b) => Number(b.price) - Number(a.price));
        } else if (sortBy === 'rating') {
            sorted.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        }

        return sorted;
    }, [allProducts, searchQuery, selectedCategory, sortBy, categories]);

    /** ✅ FIX-CART-1: Добавление товара с условной логикой */
    const handleAddToCart = async (product: any) => {
        const productName = product.title || product.name || 'Товар';

        // Если НЕ авторизован → localStorage
        if (!user) {
            try {
                addToCartLocal({
                    id: product.id,
                    name: productName,
                    price: Number(product.price) || 0,
                    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
                    customPv: product.customPv ?? null,
                    customCashback: product.customCashback ?? null,
                    slug: product.slug,
                    imageUrl: getMainProductImage(product) || '/placeholder.png',
                    quantity: 1,
                });

                toast({
                    title: 'Товар добавлен в корзину!',
                    description: `${productName} добавлен в корзину`,
                });

                setIsCartOpen(true); // Открыть корзину
            } catch {
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось добавить товар в корзину',
                    variant: 'destructive',
                });
            }
            return;
        }

        // Авторизован → backend API
        try {
            await updateCart({
                action: 'add',
                product_id: product.id,
                quantity: 1,
            }).unwrap();

            toast({
                title: 'Товар добавлен в корзину!',
                description: `${productName} добавлен в корзину`,
            });

            setIsCartOpen(true); // Открыть корзину
        } catch (err: any) {
            toast({
                title: 'Ошибка',
                description: err?.data?.message || 'Не удалось добавить товар в корзину',
                variant: 'destructive',
            });
        }
    };

    /** ✅ FIX-CART-1: Купить сейчас с условной логикой */
    const handleBuyNow = async (product: any) => {
        const productName = product.title || product.name || 'Товар';

        // Если НЕ авторизован → localStorage + переход на checkout
        if (!user) {
            try {
                addToCartLocal({
                    id: product.id,
                    name: productName,
                    price: Number(product.price) || 0,
                    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
                    customPv: product.customPv ?? null,
                    customCashback: product.customCashback ?? null,
                    slug: product.slug,
                    imageUrl: getMainProductImage(product) || '/placeholder.png',
                    quantity: 1,
                });

                navigate('/checkout');
            } catch {
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось добавить товар в корзину',
                    variant: 'destructive',
                });
            }
            return;
        }

        // Авторизован → backend API + переход на checkout
        try {
            await updateCart({
                action: 'add',
                product_id: product.id,
                quantity: 1,
            }).unwrap();

            navigate('/checkout');
        } catch (err: any) {
            toast({
                title: 'Ошибка',
                description: err?.data?.message || 'Не удалось добавить товар для покупки',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen bg-white" itemScope itemType="https://schema.org/Store">
            <SEOHead
                title="Каталог товаров — Витамины и БАД | VitaWin"
                description="Премиальные витамины, БАД и пищевые добавки в каталоге VitaWin."
                ogUrl={`${window.location.origin}/store`}
                ogImage={`${window.location.origin}/vitawin-logo.png`}
            />

            <StoreSchema products={filteredProducts} />
            <Header onCartClick={() => setIsCartOpen(true)} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Заголовок страницы */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Каталог товаров</h1>
                    <p className="text-xl text-gray-600">
                        Найдите идеальные добавки для вашего здоровья
                    </p>
                </div>

                {/* Категории */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Категории</h2>

                    <div className="mb-4 flex justify-end">
                        <Button
                            variant="outline"
                            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => {
                                setSelectedCategory('all');
                                scrollToCategory('products-grid');
                            }}
                        >
                            Все категории
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category: Category) => (
                            <Card
                                key={category.id}
                                id={category.slug}        // ← правильный ID
                                className="hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => {
                                    setSelectedCategory(category.slug);
                                    scrollToCategory('products-grid');
                                }}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl font-bold text-emerald-600">
                                                {category.name.charAt(0)}
                                            </span>
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                {category.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {category.description}
                                            </p>
                                            <Badge variant="secondary">
                                                {category.productCount ?? 0} товаров
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Сетка товаров */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Товары {selectedCategory !== 'all' && `- ${selectedCategory}`}
                        </h2>
                        <span className="text-gray-500">
                            Найдено: {filteredProducts.length} товаров
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center text-gray-500 mt-6">Загрузка товаров…</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Товары не найдены
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {searchQuery
                                    ? 'Измените поисковый запрос'
                                    : 'В этой категории пока нет товаров'}
                            </p>
                            {(searchQuery || selectedCategory !== 'all') && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                >
                                    Сбросить фильтры
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div
                            id="products-grid"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onAddToCart={handleAddToCart}
                                    onBuyNow={handleBuyNow}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
};

export default Store;
