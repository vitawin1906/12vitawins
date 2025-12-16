import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGetPublicProductQuery } from '@/store/api/domains';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import ProductGallery from '../components/product/ProductGallery';
import ProductInfo from '../components/product/ProductInfo';
import ProductReviews from '../components/product/ProductReviews';
import DetailedDescription from '../components/product/DetailedDescription';
import ProductInfoSections from '../components/product/ProductInfoSections';
import RelatedProducts from '../components/product/RelatedProducts';
import CompanyCommitments from '../components/product/CompanyCommitments';
import ReferralProgram from '../components/account/ReferralProgram';
import ProductSchema from '../components/ProductSchema';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores';
import { useUpdateCartMutation } from '@/store/api/domains/cartApi';

const ProductDetail = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // URL параметр — slug или id
    const { slug } = useParams<{ slug: string }>();

    const { toast } = useToast();
    const { user } = useAuthStore();
    const [updateCart, { isLoading: isAddingToCart }] = useUpdateCartMutation();

    // 🎯 API сам проверяет: UUID или slug → делает правильный запрос
    const { data: product, isLoading, error } =
        useGetPublicProductQuery(slug ?? "", { skip: !slug });

    console.log(product)
    // Прокрутка при смене товара
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    const handleAddToCart = async () => {
        if (!product || isAddingToCart) return;

        // ✅ Проверка авторизации
        if (!user) {
            toast({
                title: 'Требуется авторизация',
                description: 'Войдите в аккаунт для добавления товара в корзину',
                variant: 'destructive',
            });
            return;
        }

        try {
            // ✅ Отправляем товар на бэкенд через RTK Query
            await updateCart({
                action: 'add',
                product_id: product.id,
                quantity: 1,
            }).unwrap();

            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 1500);
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Не удалось добавить товар в корзину',
                variant: 'destructive',
            });
        }
    };

    // Лоадер
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Загрузка товара...</p>
                </div>
            </div>
        );
    }

    // Ошибка / товар не найден
    if (error || !product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Товар не найден</h1>
                    <p className="text-gray-600 mb-4">Проверьте правильность ссылки</p>
                    <a href="/" className="text-emerald-600 hover:text-emerald-800">
                        Вернуться на главную
                    </a>
                </div>
            </div>
        );
    }

    // Успешная загрузка
    return (
        <div className="min-h-screen bg-gray-50" itemScope itemType="https://schema.org/Product">
            <SEOHead
                title={`${product.name} — Купить с доставкой | VitaWin`}
                description={`${product.name} по цене ${product.price} ₽. ${product.description ? product.description.substring(0, 140) + '...' : ''}`}
                keywords={`${product.name}, ${typeof product.category === 'string' ? product.category : product.category?.name || ''}, витамины, БАД`}
                ogTitle={`${product.name} | VitaWin`}
                ogDescription={`Купить ${product.name} по выгодной цене ${product.price} ₽`}
                ogImage={product.images?.[0]?.mediaId || undefined}
            />

            <ProductSchema
                product={{
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: String(product.price),
                    images: product.images?.map((img) => img.mediaId) || [],
                    category: typeof product.category === 'string' ? product.category : product.category?.name || '',
                    stock: product.stock,
                    slug: product.slug,
                    sku: product.sku,
                }}
                rating={product.rating ?? 4.8}
                reviewCount={product.reviews ?? 247}
            />

            <Header onCartClick={() => setIsCartOpen(true)} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-8 mb-8 lg:mb-12">
                    <ProductGallery
                        images={product.images?.map((img) => img.mediaId) || []}
                        productName={product.name}
                    />
                    <ProductInfo product={product} onAddToCart={handleAddToCart} />
                </div>

                <ProductReviews
                    productId={product.id}
                    productName={product.name}
                />

                <ProductInfoSections product={product} />
                <ReferralProgram />
                <RelatedProducts currentProductId={product.id} currentCategory={product.categoryId} />
                <DetailedDescription productName={product.name} longDescription={product.longDescription} />
                <CompanyCommitments />
            </div>

            <Footer />
            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center shadow-xl">
                        <h3 className="text-lg font-semibold mb-2">Товар добавлен в корзину! 🛒</h3>
                        <p className="text-gray-600">{product.name} добавлен в корзину</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetail;
