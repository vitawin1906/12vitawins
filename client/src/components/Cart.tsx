import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import FreeShippingProgress from '@/components/FreeShippingProgress';
import { getProductImageUrl } from '@/utils/imageUtils';
import { formatPrice } from '@/utils/priceUtils';
import { DELIVERY_CONFIG } from '@/config/checkoutConfig';
import {
    useGetCartPreviewQuery,
    useUpdateCartMutation,
    useClearCartMutation,
} from '@/store/api/domains/cartApi';
import { useToast } from '@/hooks/use-toast';

interface CartProps {
    isOpen: boolean;
    onClose: () => void;
}

const Cart = ({ isOpen, onClose }: CartProps) => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const { user, isHydrated } = useAuthStore();
    const shouldLoad = isHydrated && !!user;

    // RTK Query preview
    const {
        data: preview,
        isFetching,
        refetch
    } = useGetCartPreviewQuery(undefined, {
        skip: !shouldLoad,
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
    });

    const [updateCart, { isLoading: isUpdating }] = useUpdateCartMutation();
    const [clearCart, { isLoading: isClearing }] = useClearCartMutation();

    // ✅ FIX-CART-3: localStorage для неавторизованных
    const localCartItems = useCartStore((state) => state.items);
    const removeItemLocal = useCartStore((state) => state.removeItem);
    const updateQuantityLocal = useCartStore((state) => state.updateQuantity);
    const clearCartLocal = useCartStore((state) => state.clearCart);

    const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

    /** Авто-обновление при появлении user */
    useEffect(() => {
        if (shouldLoad) refetch();
    }, [shouldLoad, refetch]);

    /** Автоматический рефетч при открытии корзины */
    useEffect(() => {
        if (isOpen && shouldLoad) {
            refetch();
        }
    }, [isOpen, shouldLoad, refetch]);

    // ✅ FIX-CART-3: Выбираем источник данных
    const items = user
        ? (preview?.items || []) // Авторизован → backend
        : localCartItems.map(item => ({ // НЕ авторизован → localStorage
            id: item.productId,
            productId: item.productId,
            name: item.name,
            unitPrice: String(item.price),
            qty: item.quantity,
            subtotal: String(item.price * item.quantity),
            pvTotal: item.customPv ? item.customPv * item.quantity : 0,
            imageUrl: item.imageUrl,
        }));

    // ✅ FIX-CART-3: Рассчитываем totals для localStorage
    const totals = useMemo(() => {
        if (user && preview?.totals) {
            return preview.totals;
        }

        // Для неавторизованных - расчёт из localStorage
        const subtotal = localCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const deliveryFee = subtotal >= DELIVERY_CONFIG.freeShippingThreshold ? 0 : DELIVERY_CONFIG.defaultFee;

        return {
            subtotal: String(subtotal),
            discount: '0',
            deliveryFee: String(deliveryFee),
            total: String(subtotal + deliveryFee),
            pvEarned: 0,
            cashback: '0',
        };
    }, [user, preview?.totals, localCartItems]);

    const freeShippingThreshold = DELIVERY_CONFIG.freeShippingThreshold;
    const currentTotal = Number(totals.subtotal);

    /* ------------------------------
        ✅ FIX-CART-3: Обновление количества
    ------------------------------ */
    const handleUpdateQuantity = async (productId: string, qty: number) => {
        if (processingItems.has(productId)) return;

        // Если НЕ авторизован → localStorage
        if (!user) {
            updateQuantityLocal(productId, qty);
            return;
        }

        // Авторизован → backend
        setProcessingItems(prev => new Set(prev).add(productId));

        try {
            if (qty <= 0) {
                await updateCart({
                    action: 'remove',
                    product_id: productId,
                }).unwrap();
            } else {
                await updateCart({
                    action: 'update',
                    product_id: productId,
                    quantity: qty,
                }).unwrap();
            }
        } catch (err: any) {
            toast({
                title: 'Ошибка',
                description: err?.data?.message || 'Не удалось обновить корзину',
                variant: 'destructive',
            });
        } finally {
            setProcessingItems(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    /* ------------------------------
        ✅ FIX-CART-3: Удаление товара
    ------------------------------ */
    const handleRemove = async (productId: string) => {
        if (processingItems.has(productId)) return;

        // Если НЕ авторизован → localStorage
        if (!user) {
            removeItemLocal(productId);
            toast({
                title: 'Товар удалён',
                description: 'Удалён из корзины',
            });
            return;
        }

        // Авторизован → backend
        setProcessingItems(prev => new Set(prev).add(productId));

        try {
            await updateCart({
                action: 'remove',
                product_id: productId,
            }).unwrap();

            toast({
                title: 'Товар удалён',
                description: 'Удалён из корзины',
            });
        } catch (err: any) {
            toast({
                title: 'Ошибка',
                description: err?.data?.message || 'Не удалось удалить товар',
                variant: 'destructive',
            });
        } finally {
            setProcessingItems(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    /* ------------------------------
        ✅ FIX-CART-3: Очистить корзину
    ------------------------------ */
    const handleClearCart = async () => {
        if (!confirm('Очистить корзину?')) return;

        // Если НЕ авторизован → localStorage
        if (!user) {
            clearCartLocal();
            toast({ title: 'Корзина очищена' });
            return;
        }

        // Авторизован → backend
        try {
            await clearCart().unwrap();
            toast({ title: 'Корзина очищена' });
        } catch (err: any) {
            toast({
                title: 'Ошибка',
                description: err?.data?.message || 'Не удалось очистить корзину',
                variant: 'destructive',
            });
        }
    };

    /* ------------------------------
        Checkout
    ------------------------------ */
    const handleCheckout = () => {
        onClose();
        navigate('/checkout');
    };

    /* ------------------------------
        UI
    ------------------------------ */

    if (!isOpen) return null;

    /** ✅ FIX-CART-3: Удалена проверка на авторизацию - показываем корзину для всех */

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
                <div className="flex flex-col h-full">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b">
                        <h2 className="text-lg font-semibold">Корзина</h2>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {isFetching ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col justify-center items-center h-full">
                                <ShoppingBag className="h-16 w-16 text-gray-400 mb-4" />
                                <p className="text-gray-600">Корзина пуста</p>
                                <Button onClick={onClose} className="mt-4">
                                    Продолжить покупки
                                </Button>
                            </div>
                        ) : (
                            <>
                                <FreeShippingProgress
                                    currentAmount={currentTotal}
                                    freeShippingThreshold={freeShippingThreshold}
                                    className="mb-4"
                                />

                                <div className="space-y-4">
                                    {items.map(item => {
                                        const busy = processingItems.has(item.productId);

                                        return (
                                            <Card key={item.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center space-x-4">
                                                        <img
                                                            src={getProductImageUrl(item.imageUrl)}
                                                            alt={item.name}
                                                            className="h-16 w-16 rounded-md object-cover"
                                                        />

                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-medium text-sm truncate">
                                                                {item.name}
                                                            </h3>

                                                            <p className="text-gray-500 text-sm">
                                                                {formatPrice(Number(item.unitPrice))}
                                                            </p>

                                                            {item.pvTotal && item.pvTotal > 0 && (
                                                                <p className="text-emerald-600 text-xs">
                                                                    +{item.pvTotal} PV
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Qty */}
                                                        <div className="flex items-center space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={busy || isUpdating}
                                                                onClick={() => handleUpdateQuantity(item.productId, item.qty - 1)}
                                                                className="p-0 h-8 w-8"
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>

                                                            <span className="w-6 text-center">
                                                                {busy ? '…' : item.qty}
                                                            </span>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={busy || isUpdating}
                                                                onClick={() => handleUpdateQuantity(item.productId, item.qty + 1)}
                                                                className="p-0 h-8 w-8"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>

                                                        {/* Remove */}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={busy || isUpdating}
                                                            onClick={() => handleRemove(item.productId)}
                                                            className="text-red-500 p-0 h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>

                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* FOOTER */}
                    {items.length > 0 && (
                        <div className="border-t px-4 py-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>Подытог</span>
                                <span>{formatPrice(Number(totals.subtotal))}</span>
                            </div>

                            {Number(totals.discount) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Скидка</span>
                                    <span>-{formatPrice(Number(totals.discount))}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <span>Доставка</span>
                                <span>
                                    {currentTotal >= freeShippingThreshold
                                        ? 'Бесплатно'
                                        : formatPrice(Number(totals.deliveryFee))}
                                </span>
                            </div>

                            {totals.pvEarned > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600">
                                    <span>PV</span>
                                    <span>+{totals.pvEarned} PV</span>
                                </div>
                            )}

                            {Number(totals.cashback) > 0 && (
                                <div className="flex justify-between text-sm text-emerald-600">
                                    <span>Кэшбэк VWC</span>
                                    <span>+{formatPrice(Number(totals.cashback))}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                                <span>Итого</span>
                                <span>{formatPrice(Number(totals.total))}</span>
                            </div>

                            <div className="flex gap-2 mt-3">
                                <Button
                                    className="flex-1 bg-emerald-600"
                                    disabled={isUpdating || isClearing}
                                    onClick={handleCheckout}
                                >
                                    Оформить заказ
                                </Button>

                                <Button
                                    variant="outline"
                                    disabled={isUpdating || isClearing}
                                    onClick={handleClearCart}
                                >
                                    Очистить
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Cart;
