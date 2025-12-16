import { useState } from 'react';
import { useGetMyOrdersQuery } from '@/store/api/domains';
import type { UiOrder, UiOrderItem } from '@/utils/orders/normalize';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Package, Eye, Truck, Clock, CheckCircle, AlertCircle, Calendar, Gift, ShoppingBag, CreditCard, Wallet } from "lucide-react";
import { formatDateRu } from '@/utils/dateFormat';

const statusLabels: Record<string, string> = {
  pending: 'Ожидает обработки',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
  new: 'Новый'
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  new: 'bg-gray-100 text-gray-800'
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: AlertCircle,
  new: Package
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Наличными курьеру',
  balance: 'С баланса',
  card: 'Банковская карта'
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  failed: 'Ошибка оплаты'
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

function OrderHistory() {
  const [selectedOrder, setSelectedOrder] = useState<UiOrder | null>(null);

  // Загружаем заказы пользователя через RTK Query
  const { data: orders = [], isLoading, isError } = useGetMyOrdersQuery();

  const getTotalItems = (items: UiOrderItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalSpent = () => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  };

  const getCompletedOrders = () => {
    return orders.filter((order) => order.status === 'delivered').length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История заказов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История заказов</CardTitle>
          <CardDescription>
            Все ваши покупки в одном месте
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              У вас пока нет заказов
            </h3>
            <p className="text-gray-500 mb-4">
              Оформите свой первый заказ в нашем магазине
            </p>
            <Button onClick={() => window.location.href = '/store'}>
              Перейти к покупкам
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <ShoppingBag className="h-8 w-8 text-emerald-600 mr-4" />
            <div>
              <div className="text-2xl font-bold">{orders.length}</div>
              <div className="text-sm text-gray-600">Всего заказов</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <div className="text-2xl font-bold">{getCompletedOrders()}</div>
              <div className="text-sm text-gray-600">Доставлено</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Gift className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <div className="text-2xl font-bold">{getTotalSpent().toLocaleString('ru-RU')} ₽</div>
              <div className="text-sm text-gray-600">Потрачено</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список заказов */}
      <div className="space-y-4">
        {orders.map((order) => {
          const StatusIcon = statusIcons[order.status];
          return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                  {/* Основная информация */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        Заказ #{order.id.toString().padStart(4, '0')}
                      </h3>
                      <Badge className={statusColors[order.status]}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusLabels[order.status]}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDateRu(order.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {getTotalItems(order.items)} товаров
                      </div>
                      {order.paymentMethod && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
                        </div>
                      )}
                      {order.deliveryStatus && (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Доставка: {order.deliveryStatus}
                        </div>
                      )}
                      {order.paymentStatus && (
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          <Badge className={paymentStatusColors[order.paymentStatus]}>
                            {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Сумма и действия */}
                  <div className="text-right space-y-2">
                    <div className="text-2xl font-bold text-emerald-600">
                      {order.totalAmount.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Подробнее
                      </Button>
                      {order.paymentStatus === 'pending' && order.paymentMethod !== 'cash' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => window.location.href = `/order-success?order=${order.id}`}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Доплатить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Товары в заказе */}
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Товары в заказе:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {order.items.map((item, index) => (
                      <div key={item.id || index} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="font-medium truncate">{item.productName || 'Товар'}</div>
                        <div className="text-gray-600">
                          {item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Бонусы за заказ (только для delivered) */}
                {order.status === 'delivered' && (order.pvEarned || order.vwcCashback) && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm text-emerald-700 mb-2 flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Полученные бонусы:
                      </h4>
                      <div className="space-y-1 text-sm">
                        {order.pvEarned !== undefined && order.pvEarned > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">PV (Личный объем):</span>
                            <span className="font-semibold text-emerald-700">{order.pvEarned} PV</span>
                          </div>
                        )}
                        {order.vwcCashback !== undefined && order.vwcCashback > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">VWC Кэшбек:</span>
                            <span className="font-semibold text-emerald-700">
                              {typeof order.vwcCashback === 'number' ? order.vwcCashback.toFixed(2) : order.vwcCashback} ₽
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Модальное окно с деталями заказа */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

// Компонент модального окна для деталей заказа
function OrderDetailsModal({ order, onClose }: { order: UiOrder; onClose: () => void }) {

  const getTotalItems = () => {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            Заказ #{order.id.toString().padStart(4, '0')}
          </h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>

        <div className="space-y-6">
          {/* Статус и сумма */}
          <div className="flex justify-between items-center">
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
            <div className="text-2xl font-bold text-emerald-600">
              {order.totalAmount.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <Separator />

          {/* Дата */}
          <div>
            <h3 className="font-semibold mb-2">Дата оформления</h3>
            <p className="text-gray-600">{formatDateRu(order.createdAt)}</p>
          </div>

          {/* Доставка */}
          {order.deliveryStatus && (
            <div>
              <h3 className="font-semibold mb-2">Статус доставки</h3>
              <div className="flex items-center gap-2 text-gray-600">
                <Truck className="h-4 w-4" />
                {order.deliveryStatus}
              </div>
            </div>
          )}

          {/* Адрес доставки */}
          {order.shippingAddress && (
            <div>
              <h3 className="font-semibold mb-2">Адрес доставки</h3>
              <p className="text-gray-600">{order.shippingAddress}</p>
            </div>
          )}

          {/* Товары */}
          <div>
            <h3 className="font-semibold mb-4">Товары ({getTotalItems()} шт.)</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={item.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{item.productName || 'Товар'}</div>
                    <div className="text-sm text-gray-600">
                      {item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div className="font-medium">
                    {item.total.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Итого:</span>
            <span className="text-emerald-600">
              {order.totalAmount.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {/* Бонусы за заказ (только для delivered) */}
          {order.status === 'delivered' && (order.pvEarned || order.vwcCashback) && (
            <>
              <Separator />
              <div className="bg-emerald-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700">
                  <Gift className="h-5 w-5" />
                  Полученные бонусы:
                </h3>
                <div className="space-y-2">
                  {order.pvEarned !== undefined && order.pvEarned > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">PV (Личный объем):</span>
                      <span className="text-lg font-bold text-emerald-700">{order.pvEarned} PV</span>
                    </div>
                  )}
                  {order.vwcCashback !== undefined && order.vwcCashback > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">VWC Кэшбек (5%):</span>
                      <span className="text-lg font-bold text-emerald-700">
                        {typeof order.vwcCashback === 'number' ? order.vwcCashback.toFixed(2) : order.vwcCashback} ₽
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;
