import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useSyncCartMutation, useGetCartPreviewQuery, useGetCheckoutPreviewMutation } from '@/store/api/domains/cartApi';
import { useCreateOrderMutation } from '@/store/api/domains/ordersApi';
import { useGetMyAddressesQuery, useGetDefaultAddressQuery } from '@/store/api/domains';
import { CartPreviewSection } from '@/components/checkout/CartPreviewSection';
import SEOHead from '@/components/SEOHead';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Truck,
  CreditCard,
  Wallet,
  AlertCircle,
  Loader2,
  MapPin,
  Plus,
  Gift,
  CheckCircle2
} from 'lucide-react';

import type { CreateOrderInput } from '@/types/cart';
import type { Address } from '@/types/address';
import { formatAddressOneLine } from '@/utils/address/normalize';
import {useNavigate} from "react-router-dom";

// Службы доставки
const deliveryServices = [
  {
    id: 'sdek',
    name: 'СДЭК',
    logo: Package,
    price: 300,
    estimatedDays: '2-5'
  },
  {
    id: 'russianpost',
    name: 'Почта России',
    logo: Package,
    price: 200,
    estimatedDays: '3-7'
  },
  {
    id: 'yandex',
    name: 'Яндекс Доставка',
    logo: Truck,
    price: 350,
    estimatedDays: '1-3'
  }
];

interface CheckoutFormValues {
  deliveryService: 'sdek' | 'russianpost' | 'yandex';
  deliveryAddress: string;
  selectedAddressId?: string | null;
  paymentMethod: 'card' | 'vwc' | 'mixed';
  comment: string;
  referralCode: string;
}

const Checkout = () => {
const navigate = useNavigate();
const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [referralCodeApplied, setReferralCodeApplied] = useState(false);

  const { items: localItems, clearCart } = useCartStore();
  const user = useAuthStore(state => state.user);
  const { toast } = useToast();

  // RTK Query hooks
  const [syncCart] = useSyncCartMutation();
  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = useGetCartPreviewQuery(undefined, {
    skip: !user, // Не загружаем пока не авторизован
  });
  const [getCheckoutPreview, { data: checkoutPreview, isLoading: isLoadingCheckout }] = useGetCheckoutPreviewMutation();
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const { data: addresses = [], isLoading: addressesLoading } = useGetMyAddressesQuery();
  const { data: defaultAddress } = useGetDefaultAddressQuery();

  // Form
  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      deliveryService: 'sdek',
      deliveryAddress: '',
      selectedAddressId: null,
      paymentMethod: 'card',
      comment: '',
      referralCode: '',
    },
  });

  // Apply referral code
  const handleApplyReferralCode = async () => {
    const code = form.watch('referralCode');
    if (!code.trim()) {
      toast({
        title: 'Введите реферальный код',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await getCheckoutPreview({ referralCode: code }).unwrap();

      if (result.totals.referralDiscount && parseFloat(result.totals.referralDiscount) > 0) {
        setReferralCodeApplied(true);
        toast({
          title: 'Реферальный код применён!',
          description: `Скидка: ${result.totals.referralDiscount} ₽`,
        });
      } else {
        toast({
          title: 'Реферальный код не найден',
          description: 'Проверьте правильность кода',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось применить код',
        variant: 'destructive',
      });
    }
  };

  // Load checkout preview on mount
  useEffect(() => {
    if (user && preview && preview.items.length > 0) {
      getCheckoutPreview({ referralCode: form.watch('referralCode') || undefined });
    }
  }, [user, preview]);

  // Auto-select default address
  useEffect(() => {
    if (defaultAddress && !form.watch('selectedAddressId')) {
      form.setValue('selectedAddressId', defaultAddress.id);
      form.setValue('deliveryAddress', formatAddressOneLine(defaultAddress));
    }
  }, [defaultAddress]);

  const selectedDeliveryService = form.watch('deliveryService');
  const selectedService = deliveryServices.find(s => s.id === selectedDeliveryService);

  // Handle address selection
  const handleAddressSelect = (address: Address) => {
    form.setValue('selectedAddressId', address.id);
    form.setValue('deliveryAddress', formatAddressOneLine(address));
  };

  // Проверка авторизации
  useEffect(() => {
    if (!user) {
      toast({
        title: 'Требуется авторизация',
        description: 'Пожалуйста, войдите в систему для оформления заказа',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [user, toast]);

  // ✅ FIX-0.4: Синхронизация ОДИН РАЗ при монтировании компонента
  // Убрана зависимость от user чтобы избежать повторных вызовов
  useEffect(() => {
    if (user && localItems.length > 0 && !isSyncing) {
      syncLocalCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Пустой массив = выполняется только при монтировании

  const syncLocalCart = async () => {
    if (!localItems.length) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // ✅ FIX-0.5: Получаем детальные результаты синхронизации
      const result = await syncCart(localItems).unwrap();

      // После синхронизации обновляем preview
      await refetchPreview();

      // ✅ FIX-0.5: Показываем пользователю детали синхронизации
      const { results } = result;
      const hasIssues = results.skipped.length > 0 || results.failed.length > 0;

      if (hasIssues) {
        // Часть товаров не синхронизирована
        let description = `Синхронизировано: ${results.synced.length}/${localItems.length}`;

        if (results.skipped.length > 0) {
          description += `\nПропущено: ${results.skipped.length} (нет в наличии)`;
        }

        if (results.failed.length > 0) {
          description += `\nОшибок: ${results.failed.length}`;
        }

        toast({
          title: 'Синхронизация завершена с предупреждениями',
          description,
          variant: 'default',
        });
      } else {
        // Все товары успешно синхронизированы
        toast({
          title: 'Корзина синхронизирована',
          description: `Добавлено ${results.synced.length} товаров`,
        });
      }
    } catch (error: any) {
      setSyncError('Не удалось синхронизировать корзину');
      toast({
        title: 'Ошибка синхронизации',
        description: error?.data?.message || 'Попробуйте еще раз',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    if (!user) {
      toast({
        title: 'Требуется авторизация',
        variant: 'destructive',
      });
      return;
    }

    if (!data.deliveryAddress.trim()) {
      toast({
        title: 'Укажите адрес доставки',
        variant: 'destructive',
      });
      return;
    }

    if (!preview || preview.items.length === 0) {
      toast({
        title: 'Корзина пуста',
        description: 'Добавьте товары в корзину перед оформлением заказа',
        variant: 'destructive',
      });
      return;
    }

    try {
      // ✅ Генерируем idempotency key для защиты от дублирования заказов
      const idempotencyKey = crypto.randomUUID();

      const orderInput: CreateOrderInput = {
        comment: data.comment || undefined,
        paymentMethod: data.paymentMethod,
        deliveryAddress: data.deliveryAddress,
        deliveryService: data.deliveryService,
        promoCode: data.referralCode || undefined, // ✅ Реферальный код (Telegram ID)
        idempotencyKey, // ✅ Защита от дублей
        // ❌ deliveryFeeRub убрали - бэкенд сам рассчитает
      };

      const order = await createOrder(orderInput).unwrap();

      // Очищаем локальную корзину после успешного создания заказа
      clearCart();

      toast({
        title: 'Заказ успешно создан! 🎉',
        description: `Номер заказа: ${order.id}`,
      });

      // Перенаправляем на страницу успеха
      navigate(`/checkout/success?orderId=${order.id}`);
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast({
        title: 'Ошибка создания заказа',
        description: error?.data?.message || 'Попробуйте еще раз',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return null; // Redirect handled in useEffect
  }

  return (
    <>
      <SEOHead
        title="Оформление заказа - Vitawin"
        description="Завершите оформление заказа"
      />
        <Header onCartClick={() => {}} />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Оформление заказа</h1>

          {/* Показываем статус синхронизации */}
          {isSyncing && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Синхронизация корзины с сервером...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {syncError && (
            <Card className="mb-6 bg-red-50 border-red-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{syncError}</p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-red-600"
                      onClick={syncLocalCart}
                    >
                      Повторить синхронизацию
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Левая колонка - Форма заказа */}
            <div className="lg:col-span-2 space-y-6">

              {/* Способ доставки */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Способ доставки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={form.watch('deliveryService')}
                    onValueChange={(value) => form.setValue('deliveryService', value as any)}
                  >
                    <div className="space-y-3">
                      {deliveryServices.map((service) => (
                        <div
                          key={service.id}
                          className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition ${
                            form.watch('deliveryService') === service.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => form.setValue('deliveryService', service.id as any)}
                        >
                          <RadioGroupItem value={service.id} id={service.id} />
                          <Label htmlFor={service.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {service.estimatedDays} дней
                                </p>
                              </div>
                              <p className="font-semibold">{service.price} ₽</p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Адрес доставки */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Адрес доставки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Список сохранённых адресов */}
                    {addressesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : addresses.length > 0 ? (
                      <div className="space-y-3">
                        <Label>Выберите адрес доставки</Label>
                        <RadioGroup
                          value={form.watch('selectedAddressId') || ''}
                          onValueChange={(value) => {
                            const address = addresses.find(a => a.id === value);
                            if (address) handleAddressSelect(address);
                          }}
                        >
                          {addresses.map((address) => (
                            <div
                              key={address.id}
                              className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition ${
                                form.watch('selectedAddressId') === address.id
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleAddressSelect(address)}
                            >
                              <RadioGroupItem value={address.id} id={address.id} />
                              <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                                <div className="font-medium flex items-center gap-2">
                                  {address.name}
                                  {address.isDefault && (
                                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                      По умолчанию
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {formatAddressOneLine(address)}
                                </p>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>

                        {/* Кнопка для добавления нового адреса */}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open('/account?tab=addresses', '_blank')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить новый адрес
                        </Button>
                      </div>
                    ) : (
                      // Если нет адресов - показываем поле ввода
                      <div className="space-y-3">
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          У вас пока нет сохранённых адресов
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open('/account?tab=addresses', '_blank')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить адрес в профиле
                        </Button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">или введите вручную</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="deliveryAddress">
                            Адрес доставки *
                          </Label>
                          <Textarea
                            id="deliveryAddress"
                            placeholder="Город, улица, дом, квартира"
                            {...form.register('deliveryAddress', { required: true })}
                            rows={3}
                          />
                          {form.formState.errors.deliveryAddress && (
                            <p className="text-sm text-red-500 mt-1">
                              Адрес доставки обязателен
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Способ оплаты */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Способ оплаты
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={form.watch('paymentMethod')}
                    onValueChange={(value) => form.setValue('paymentMethod', value as any)}
                  >
                    <div className="space-y-3">
                      <div
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition ${
                          form.watch('paymentMethod') === 'card'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => form.setValue('paymentMethod', 'card')}
                      >
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            <span className="font-medium">Банковская карта</span>
                          </div>
                        </Label>
                      </div>

                      <div
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition ${
                          form.watch('paymentMethod') === 'vwc'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => form.setValue('paymentMethod', 'vwc')}
                      >
                        <RadioGroupItem value="vwc" id="vwc" />
                        <Label htmlFor="vwc" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            <span className="font-medium">С баланса VWC</span>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Реферальный код */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-emerald-600" />
                    Реферальный код
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Есть реферальный код? Получите скидку 10% (до 1000 ₽) на заказ!
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Введите Telegram ID реферера"
                        {...form.register('referralCode')}
                        disabled={referralCodeApplied || isLoadingCheckout}
                      />
                      <Button
                        type="button"
                        variant={referralCodeApplied ? "outline" : "default"}
                        onClick={handleApplyReferralCode}
                        disabled={referralCodeApplied || isLoadingCheckout}
                        className="whitespace-nowrap"
                      >
                        {isLoadingCheckout ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : referralCodeApplied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Применён
                          </>
                        ) : (
                          'Применить'
                        )}
                      </Button>
                    </div>
                    {checkoutPreview && referralCodeApplied && parseFloat(checkoutPreview.totals.referralDiscount) > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Скидка {checkoutPreview.totals.referralDiscount} ₽ применена!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Комментарий к заказу */}
              <Card>
                <CardHeader>
                  <CardTitle>Комментарий к заказу</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Дополнительные пожелания или инструкции по доставке (необязательно)"
                    {...form.register('comment')}
                    rows={3}
                  />
                </CardContent>
              </Card>

            </div>

            {/* Правая колонка - Предпросмотр заказа */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-6">
                <CartPreviewSection />

                {/* Checkout Preview - бонусы и скидки */}
                {checkoutPreview && (
                  <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardHeader>
                      <CardTitle className="text-base">Ваши бонусы</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {parseFloat(checkoutPreview.totals.referralDiscount) > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">Реферальная скидка</span>
                          <span className="font-semibold text-emerald-700">
                            -{checkoutPreview.totals.referralDiscount} ₽
                          </span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-emerald-200">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-gray-700">После оплаты получите:</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">PV баллы</span>
                            <span className="font-semibold text-purple-700">
                              +{checkoutPreview.totals.pvPreview} PV
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">VWC кэшбэк</span>
                            <span className="font-semibold text-blue-700">
                              +{checkoutPreview.totals.vwcPreview} ₽
                            </span>
                          </div>
                        </div>
                      </div>

                      {checkoutPreview.totals.freeShipping && (
                        <div className="pt-3 border-t border-emerald-200">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Бесплатная доставка!</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Кнопка оформления заказа */}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isCreatingOrder || isSyncing || !preview || preview.items.length === 0}
                >
                  {isCreatingOrder ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Создание заказа...
                    </>
                  ) : (
                    <>
                      Оформить заказ
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Нажимая кнопку, вы соглашаетесь с{' '}
                  <a href="/terms" className="underline">
                    условиями использования
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Checkout;
