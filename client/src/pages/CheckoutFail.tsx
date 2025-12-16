import { useEffect, useState } from 'react';
import { XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useToast } from '../hooks/use-toast';
import {useNavigate} from "react-router-dom";

const CheckoutFail = () => {
const navigate = useNavigate();
const searchParams = new URLSearchParams(window.location.search);
  const { toast } = useToast();
  const [orderData, setOrderData] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Восстанавливаем данные заказа из localStorage
    const pendingOrderData = localStorage.getItem('pendingOrder');
    if (pendingOrderData) {
      const data = JSON.parse(pendingOrderData);
      setOrderData(data);
      
      toast({
        title: "Платеж не прошел",
        description: "Попробуйте оплатить заказ еще раз или выберите другой способ оплаты",
        variant: "destructive",
      });
    }
  }, [toast]);

  const retryPayment = async () => {
    if (!orderData) return;
    
    try {
      setIsRetrying(true);
      
      // Создаем новый платеж для существующего заказа
      const paymentResponse = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          amount: orderData.totalAmount,
          description: `Заказ №${orderData.orderId} в магазине VitaWin (повторная оплата)`,
          customerEmail: orderData.formData.email,
          customerPhone: orderData.formData.phone
        })
      });

      if (!paymentResponse.ok) {
        throw new Error('Ошибка создания платежа');
      }

      const paymentData = await paymentResponse.json();

      if (paymentData.success && paymentData.paymentUrl) {
        // Перенаправляем на страницу оплаты Тинькофф
        window.location.href = paymentData.paymentUrl;
      } else {
        throw new Error(paymentData.error || 'Ошибка создания платежа');
      }
      
    } catch (error) {
      toast({
        title: "Ошибка повторной оплаты",
        description: error instanceof Error ? error.message : "Попробуйте еще раз",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const cancelOrder = () => {
    // Очищаем localStorage и возвращаемся в корзину
    localStorage.removeItem('pendingOrder');
    navigate('/cart');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead 
        title="Ошибка оплаты — VitaWin"
        description="Ошибка при обработке платежа. Попробуйте оплатить заказ еще раз."
        keywords=""
        ogTitle="Ошибка оплаты — VitaWin"
        ogDescription="Ошибка при обработке платежа. Попробуйте оплатить заказ еще раз."
        ogUrl={`${window.location.origin}/checkout-fail`}
        ogImage={`${window.location.origin}/vitawin-logo.png`}
        noindex={true}
      />
      <Header onCartClick={() => {}} />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-16 w-16 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Платеж не прошел
            </h1>
            
            {orderData && (
              <p className="text-gray-600 mb-2">
                Заказ №{orderData.orderId} создан, но не оплачен
              </p>
            )}
            
            <p className="text-gray-600 mb-8">
              Возможные причины: недостаточно средств на карте, технические проблемы банка 
              или истекло время ожидания. Попробуйте оплатить еще раз.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={retryPayment} 
                disabled={isRetrying || !orderData}
                className="bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Создание платежа...
                  </>
                ) : (
                  'Повторить оплату'
                )}
              </Button>
              <Button 
                onClick={cancelOrder}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Вернуться в корзину
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Если проблема повторяется, обратитесь в службу поддержки
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutFail;