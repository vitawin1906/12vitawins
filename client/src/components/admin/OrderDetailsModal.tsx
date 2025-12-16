import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, User, Calendar, MapPin, Gift } from 'lucide-react';
import type { UiOrder } from '@/utils/orders/normalize';
import { formatDateTimeRu } from '@/utils/dateFormat';

interface OrderDetailsModalProps {
  order: UiOrder;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен'
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {

  const getItemsTotal = () => {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Заказ #{order.id.toString().padStart(4, '0')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Статус и основная информация */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Badge className={`${statusColors[order.status]} text-sm px-3 py-1`}>
              {statusLabels[order.status]}
            </Badge>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {order.totalAmount.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-sm text-gray-500">
                {getItemsTotal()} товаров
              </div>
            </div>
          </div>

          <Separator />

          {/* Информация о клиенте */}
          {(order.userName || order.userEmail || order.userId) && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <User className="h-4 w-4" />
                Информация о клиенте
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {order.userName && (
                  <div>
                    <span className="font-medium">Имя:</span> {order.userName}
                  </div>
                )}
                {order.userEmail && (
                  <div>
                    <span className="font-medium">Email:</span> {order.userEmail}
                  </div>
                )}
                {order.userId && (
                  <div>
                    <span className="font-medium">ID пользователя:</span> {order.userId}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Дата заказа */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Calendar className="h-4 w-4" />
              Дата оформления
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {formatDateTimeRu(order.createdAt)}
            </div>
          </div>

          {/* Адрес доставки */}
          {order.shippingAddress && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                Адрес доставки
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {order.shippingAddress}
              </div>
            </div>
          )}

          {/* Товары в заказе */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Товары в заказе
            </h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={item.id || index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName || 'Товар'}</div>
                    <div className="text-sm text-gray-500">
                      Количество: {item.quantity} шт.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {item.total.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.price.toLocaleString('ru-RU')} ₽ за шт.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Итого */}
          <Separator />
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Итого к оплате:</span>
            <span className="text-emerald-600">
              {order.totalAmount.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {/* Кнопка закрытия */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}