import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import FreeShippingProgress from '../components/FreeShippingProgress';
import { getProductImageUrl } from '../utils/imageUtils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { useCartStore } from '@/stores';
import { ShoppingBag, CreditCard, Truck, Gift } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { usePayment } from '../hooks/usePayment';
import { supabase } from '../integrations/supabase/client';
import { calculateTotalBonuses } from '@/utils/cartBonuses';
import {useNavigate} from "react-router-dom";

const QuickCheckout = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { toast } = useToast();
  const { createPayment, redirectToPayment, isProcessing } = usePayment();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Создаем заказ в базе данных
      const orderId = crypto.randomUUID();
      const totalAmount = total / 100; // Переводим копейки в рубли
      
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: null, // Для неавторизованных пользователей
          total_amount: totalAmount,
          status: 'pending',
        });

      if (orderError) {
        throw new Error('Ошибка создания заказа');
      }

      // Создаем платеж через Тинькофф
      const paymentResult = await createPayment({
        amount: totalAmount,
        orderId: orderId,
        description: `Заказ ${orderId} на сумму ${totalAmount} руб.`,
        customerEmail: formData.email,
      });

      if (paymentResult.success && paymentResult.paymentUrl) {
        // Сохраняем данные заказа для восстановления после оплаты
        localStorage.setItem('pendingOrder', JSON.stringify({
          orderId,
          items,
          formData,
          totalCoins: bonuses.coins,
        }));

        // Перенаправляем на страницу оплаты
        redirectToPayment(paymentResult.paymentUrl);
      }

    } catch (error) {
      toast({
        title: "Ошибка оформления заказа",
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
        variant: "destructive",
      });
    }
  };

  const freeShippingThreshold = 5000;
  const subtotal = getTotalPrice();
  const deliveryFee = subtotal >= freeShippingThreshold ? 0 : 350;
  const total = subtotal + deliveryFee;

  // Используем централизованную утилиту для расчета бонусов
  const bonuses = calculateTotalBonuses(items);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => setIsCartOpen(true)} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <div className="text-center">
            <ShoppingBag className="h-12 md:h-16 w-12 md:w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Корзина пуста</h1>
            <p className="text-sm md:text-base text-gray-600 mb-6">Добавьте товары в корзину для оформления заказа</p>
            <Button onClick={() => navigate('/')} className="bg-emerald-600 hover:bg-emerald-700">
              Продолжить покупки
            </Button>
          </div>
        </div>
        <Footer />
        <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Быстрое оформление заказа</h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">Заполните данные для быстрого оформления заказа</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Order form */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base md:text-lg">
                  <Truck className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Данные для доставки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm">Имя</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm">Фамилия</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Телефон</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address" className="text-sm">Адрес доставки</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm">Город</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode" className="text-sm">Почтовый индекс</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information - Updated */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base md:text-lg">
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Способ оплаты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-blue-900">Банковская карта</h3>
                      <p className="text-sm text-blue-700">Оплата через Тинькофф банк</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  После нажатия кнопки "Оплатить" вы будете перенаправлены на безопасную страницу оплаты Тинькофф банка.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Order summary */}
          <div className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Ваш заказ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Free Shipping Progress */}
                <FreeShippingProgress 
                  currentAmount={subtotal}
                  freeShippingThreshold={freeShippingThreshold}
                />
                
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center space-x-2 md:space-x-3">
                    <img
                      src={getProductImageUrl(item.imageUrl)}
                      alt={item.name}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs md:text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                      <p className="text-xs text-gray-500">Количество: {item.quantity}</p>
                    </div>
                    <span className="text-xs md:text-sm font-medium">{item.price * item.quantity} ₽</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Подытог:</span>
                    <span>{subtotal} ₽</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Доставка:</span>
                    <span className={deliveryFee === 0 ? "text-emerald-600 font-medium" : ""}>
                      {deliveryFee === 0 ? 'Бесплатно' : `${deliveryFee} ₽`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base md:text-lg font-bold">
                    <span>Итого:</span>
                    <span>{total} ₽</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bonus information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base md:text-lg">
                  <Gift className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Ваши бонусы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs md:text-sm font-medium text-blue-800">PV баллы (MLM)</span>
                  <span className="text-base md:text-lg font-bold text-blue-600">+{bonuses.pv} PV</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-xs md:text-sm font-medium text-emerald-800">Кэшбек / Монеты</span>
                  <span className="text-base md:text-lg font-bold text-emerald-600">{bonuses.cashback} ₽</span>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 md:py-3 text-sm md:text-base"
            >
              {isProcessing ? 'Создание платежа...' : `Оплатить ${total} ₽`}
            </Button>
          </div>
        </form>
      </main>

      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default QuickCheckout;
