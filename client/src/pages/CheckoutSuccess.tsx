import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from "react-router-dom";
import {useGetOrderByIdQuery} from "@/store/api/domains";

const CheckoutSuccess = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // 1️⃣ Берём orderId из URL
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('orderId');

    // 2️⃣ Получаем заказ из API
    const { data: order, isLoading, isError } = useGetOrderByIdQuery(orderId!, {
        skip: !orderId,
    });

    // 3️⃣ Показ toast только один раз, когда заказ загружен
    useEffect(() => {
        if (order) {
            toast({
                title: "Платеж успешно обработан!",
                description: `Заказ ${order.id} оплачен. Спасибо за покупку!`,
            });
        }
    }, [order, toast]);

    return (
        <div className="min-h-screen bg-gray-50">
            <SEOHead
                title="Платеж успешно обработан — VitaWin"
                description="Платеж успешно обработан. Ваш заказ принят к исполнению."
                ogTitle="Платеж успешно обработан — VitaWin"
                ogDescription="Платеж успешно обработан. Ваш заказ принят к исполнению."
                ogUrl={`${window.location.origin}/checkout-success`}
                ogImage={`${window.location.origin}/vitawin-logo.png`}
                noindex={true}
            />

            <Header onCartClick={() => {}} />

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                <Card className="text-center">
                    <CardContent className="pt-8 pb-8">

                        {/* Иконка успеха */}
                        <div className="flex justify-center mb-6">
                            <div className="rounded-full bg-green-100 p-4">
                                <CheckCircle className="h-16 w-16 text-green-600" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            Платеж успешно обработан!
                        </h1>

                        {/* LOADING state */}
                        {isLoading && (
                            <p className="text-gray-600 mb-6">Загружаем данные заказа...</p>
                        )}

                        {/* ERROR state */}
                        {isError && (
                            <p className="text-red-500 mb-6">
                                Ошибка загрузки заказа. Попробуйте позже.
                            </p>
                        )}

                        {/* SUCCESS state */}
                        {order && (
                            <>
                                <p className="text-gray-600 mb-2">
                                    Номер заказа:&nbsp;
                                    <span className="font-semibold">{order.id}</span>
                                </p>

                                {/* ✅ FIX-2.1: Показ бонусов только если deliveryStatus='delivered' */}
                                {order.deliveryStatus === 'delivered' && (order.pvEarned !== undefined || order.vwcCashback !== undefined) && (
                                    <div className="bg-emerald-50 p-4 rounded-lg mt-4 mb-6 text-left">
                                        <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" />
                                            Вы получили бонусы:
                                        </h3>

                                        {order.pvEarned !== undefined && order.pvEarned > 0 && (
                                            <div className="flex justify-between mb-2 text-sm">
                                                <span className="text-gray-700">PV (Личный объем):</span>
                                                <span className="font-bold text-emerald-700">{order.pvEarned} PV</span>
                                            </div>
                                        )}

                                        {order.vwcCashback !== undefined && order.vwcCashback > 0 && (
                                            <div className="flex justify-between mb-3 text-sm">
                                                <span className="text-gray-700">VWC Кэшбек (5%):</span>
                                                <span className="font-bold text-emerald-700">
                                                    {typeof order.vwcCashback === 'number'
                                                        ? order.vwcCashback.toFixed(2)
                                                        : order.vwcCashback} ₽
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Показать информацию о предстоящих бонусах если НЕ delivered */}
                                {order.deliveryStatus !== 'delivered' && (order.pvEarned !== undefined || order.vwcCashback !== undefined) && (
                                    <div className="bg-blue-50 p-4 rounded-lg mt-4 mb-6 text-left">
                                        <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" />
                                            Ожидаемые бонусы:
                                        </h3>

                                        {order.pvEarned !== undefined && order.pvEarned > 0 && (
                                            <div className="flex justify-between mb-2 text-sm">
                                                <span className="text-gray-700">PV (Личный объем):</span>
                                                <span className="font-bold text-blue-700">{order.pvEarned} PV</span>
                                            </div>
                                        )}

                                        {order.vwcCashback !== undefined && order.vwcCashback > 0 && (
                                            <div className="flex justify-between mb-3 text-sm">
                                                <span className="text-gray-700">VWC Кэшбек (5%):</span>
                                                <span className="font-bold text-blue-700">
                                                    {typeof order.vwcCashback === 'number'
                                                        ? order.vwcCashback.toFixed(2)
                                                        : order.vwcCashback} ₽
                                                </span>
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-blue-200">
                                            <p className="text-blue-700 text-xs">
                                                ℹ️ Бонусы будут начислены автоматически после подтверждения доставки заказа.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <p className="text-gray-600 mb-8">
                            Мы отправили подтверждение на вашу электронную почту.
                            Вы можете отслеживать статус заказа в личном кабинете.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="flex-1 sm:flex-none"
                            >
                                Продолжить покупки
                            </Button>

                            <Button
                                onClick={() => navigate('/account')}
                                className="bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none"
                            >
                                Личный кабинет
                            </Button>
                        </div>

                    </CardContent>
                </Card>

            </main>

            <Footer />
        </div>
    );
};

export default CheckoutSuccess;
