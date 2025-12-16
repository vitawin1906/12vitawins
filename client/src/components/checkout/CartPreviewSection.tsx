// client/src/components/checkout/CartPreviewSection.tsx
import { useGetCartPreviewQuery } from '@/store/api/domains/cartApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Coins, Gift } from 'lucide-react';

export function CartPreviewSection() {
  const { data: preview, isLoading, error } = useGetCartPreviewQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ваш заказ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ваш заказ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Корзина пуста</p>
        </CardContent>
      </Card>
    );
  }

  const { items, totals } = preview;

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ваш заказ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Корзина пуста</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Ваш заказ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Список товаров */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              {/* Картинка товара */}
              <div className="flex-shrink-0">
                <img
                  src={item.imageUrl || '/placeholder.svg'}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded border"
                />
              </div>

              {/* Информация о товаре */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.qty} × {Number(item.unitPrice).toLocaleString()} ₽
                </p>
                {(item.pvTotal ?? 0) > 0 && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    +{item.pvTotal} PV
                  </p>
                )}
              </div>

              {/* Итого за позицию */}
              <div className="text-right">
                <p className="text-sm font-medium">
                  {Number(item.lineTotal).toLocaleString()} ₽
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Итоговые расчеты */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Подытог:</span>
            <span>{Number(totals.subtotal).toLocaleString()} ₽</span>
          </div>

          {Number(totals.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Скидка:</span>
              <span>-{Number(totals.discount).toLocaleString()} ₽</span>
            </div>
          )}

          {Number(totals.deliveryFee) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Доставка:</span>
              <span>{Number(totals.deliveryFee).toLocaleString()} ₽</span>
            </div>
          )}

          {totals.pvEarned > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <Coins className="h-4 w-4 inline-block mr-1" />
              <span>Вы получите PV:</span>
              <span className="font-medium">{totals.pvEarned} PV</span>
            </div>
          )}

          {Number(totals.cashback) > 0 && (
            <div className="flex justify-between text-sm text-blue-600">
              <Gift className="h-4 w-4 inline-block mr-1" />
              <span>Кэшбек на счет:</span>
              <span className="font-medium">{Number(totals.cashback).toLocaleString()} ₽</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-base font-bold">
            <span>Итого:</span>
            <span className="text-lg">{Number(totals.total).toLocaleString()} ₽</span>
          </div>
        </div>

        {/* Информационное сообщение */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 PV и кэшбек будут начислены после получения заказа
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
