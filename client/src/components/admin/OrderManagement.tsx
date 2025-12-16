import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, User, DollarSign, Truck, Eye, Search, Download, Loader2 } from "lucide-react";
import {
    useGetAllOrdersQuery,
    useMarkAsDeliveredMutation,
    useUpdateOrderStatusMutation,
    Order,
} from '@/store/api/domains';
import { formatDateTimeRu, formatDateShortRu } from '@/utils/dateFormat';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
    pending: 'Ожидает обработки',
    processing: 'В обработке',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    cancelled: 'Отменен'
};

function OrderManagement() {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const { toast } = useToast();

    // RTK Query hooks
    const { data: orders = [], isLoading, isError, refetch } = useGetAllOrdersQuery();
    const [markAsDelivered] = useMarkAsDeliveredMutation();
    const [updateOrderStatus] = useUpdateOrderStatusMutation();

    // Фильтрация заказов
    const filteredOrders = useMemo(() => {
        return orders.filter((order: Order) => {
            const matchesSearch =
                searchTerm === '' ||
                String(order.id).includes(searchTerm) ||
                order.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

            const orderDate = new Date(order.createdAt);
            const now = new Date();
            const matchesDate =
                dateFilter === 'all' ||
                (dateFilter === 'today' && orderDate.toDateString() === now.toDateString()) ||
                (dateFilter === 'week' && (now.getTime() - orderDate.getTime()) <= 7 * 24 * 60 * 60 * 1000) ||
                (dateFilter === 'month' && (now.getTime() - orderDate.getTime()) <= 30 * 24 * 60 * 60 * 1000);

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, dateFilter]);

    // Пометить доставленным
    const handleMarkAsDelivered = async (orderId: string) => {
        try {
            // если ваш эндпоинт принимает объект — используйте { orderId }
            await (markAsDelivered as any)(orderId).unwrap();
            toast({ title: "Заказ помечен как доставленный" });
        } catch (error: any) {
            toast({
                title: "Ошибка",
                description: error?.data?.message || "Не удалось обновить статус заказа",
                variant: "destructive"
            });
        }
    };


    const getTotalItems = (items: Array<{ quantity: number }>) =>
        (items ?? []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-red-600">Ошибка загрузки заказов</p>
                <Button onClick={() => refetch()} variant="outline">
                    Попробовать снова
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Управление заказами</h2>
                    <p className="text-gray-600">Общий реестр всех заказов в системе</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Экспорт
                    </Button>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-sm text-gray-600">Всего заказов</p>
                                <p className="text-lg font-semibold">{orders.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-sm text-gray-600">Общая сумма</p>
                                <p className="text-lg font-semibold">
                                    {orders
                                        .reduce((sum: number, o: Order) => sum + Number(o.totalAmount ?? 0), 0)
                                        .toFixed(2)} ₽
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="text-sm text-gray-600">В обработке</p>
                                <p className="text-lg font-semibold">
                                    {orders.filter((o: Order) => ['pending', 'processing'].includes(o.status)).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="text-sm text-gray-600">Проблемные</p>
                                <p className="text-lg font-semibold text-red-600">
                                    {orders.filter((o: Order) => !o.userId).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Фильтры */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Поиск по номеру заказа, имени клиента..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все статусы</SelectItem>
                                <SelectItem value="pending">Ожидает обработки</SelectItem>
                                <SelectItem value="processing">В обработке</SelectItem>
                                <SelectItem value="shipped">Отправлен</SelectItem>
                                <SelectItem value="delivered">Доставлен</SelectItem>
                                <SelectItem value="cancelled">Отменен</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Период" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все время</SelectItem>
                                <SelectItem value="today">Сегодня</SelectItem>
                                <SelectItem value="week">Неделя</SelectItem>
                                <SelectItem value="month">Месяц</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Список заказов */}
            <div className="grid gap-4">
                {filteredOrders.map((order: Order) => (
                    <Card key={order.id}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h3 className="font-semibold">Заказ #{order.id}</h3>
                                        <p className="text-sm text-gray-600">{formatDateTimeRu(order.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Клиент:</p>
                                        <p className="font-medium">{order.userName || order.userEmail || 'Неизвестен'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Товаров:</p>
                                        <p className="font-medium">{getTotalItems(order.items as any[])}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Сумма:</p>
                                        <p className="font-medium">{order.totalAmount} ₽</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                                        {statusLabels[order.status as keyof typeof statusLabels]}
                                    </Badge>

                                    <Select
                                        value={order.status}
                                        onValueChange={async (status) => {
                                            try {
                                                await updateOrderStatus({ orderId: String(order.id), status }).unwrap();
                                                toast({ title: 'Статус обновлён' });
                                            } catch (err: any) {
                                                toast({
                                                    title: 'Ошибка',
                                                    description: err?.data?.message || 'Не удалось обновить статус',
                                                    variant: 'destructive',
                                                });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Ожидает обработки</SelectItem>
                                            <SelectItem value="processing">В обработке</SelectItem>
                                            <SelectItem value="shipped">Отправлен</SelectItem>
                                            <SelectItem value="delivered">Доставлен</SelectItem>
                                            <SelectItem value="cancelled">Отменен</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredOrders.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">Заказы не найдены</h3>
                        <p className="text-gray-500">Попробуйте изменить фильтры поиска</p>
                    </CardContent>
                </Card>
            )}

            {/* Детали заказа (модальное окно) */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Заказ #{selectedOrder.id}</CardTitle>
                                    <CardDescription>Создан: {formatDateTimeRu(selectedOrder.createdAt)}</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                                    Закрыть
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Информация о клиенте */}
                            <div>
                                <h4 className="font-medium mb-2">Информация о клиенте</h4>
                                <div className="bg-gray-50 p-3 rounded space-y-1">
                                    <p><span className="font-medium">Имя/логин:</span> {selectedOrder.userName || selectedOrder.userEmail || 'Неизвестен'}</p>
                                    {/* Доп. поля, если backend присылает (не ломают типизацию) */}
                                    { (selectedOrder as any)?.customerInfo?.phone && (
                                        <p><span className="font-medium">Телефон:</span> {(selectedOrder as any).customerInfo.phone}</p>
                                    )}
                                    { (selectedOrder as any)?.customerInfo?.email && (
                                        <p><span className="font-medium">Email:</span> {(selectedOrder as any).customerInfo.email}</p>
                                    )}
                                </div>
                            </div>

                            {/* Информация о доставке (опционально) */}
                            <div>
                                <h4 className="font-medium mb-2">Информация о доставке</h4>
                                <div className="bg-blue-50 p-3 rounded space-y-1">
                                    { (selectedOrder as any)?.deliveryAddress && (
                                        <p><span className="font-medium">Адрес:</span> {(selectedOrder as any).deliveryAddress}</p>
                                    )}
                                    { (selectedOrder as any)?.deliveryCity && (
                                        <p><span className="font-medium">Город:</span> {(selectedOrder as any).deliveryCity}</p>
                                    )}
                                    { (selectedOrder as any)?.trackingNumber && (
                                        <p><span className="font-medium">Трек-номер:</span> {(selectedOrder as any).trackingNumber}</p>
                                    )}
                                    { (selectedOrder as any)?.estimatedDelivery && (
                                        <p><span className="font-medium">Ожидаемая доставка:</span> {formatDateShortRu((selectedOrder as any).estimatedDelivery)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Информация об оплате */}
                            <div>
                                <h4 className="font-medium mb-2">Информация об оплате</h4>
                                <div className="bg-green-50 p-3 rounded space-y-1">
                                    <p>
                                        <span className="font-medium">Способ оплаты:</span>{' '}
                                        {selectedOrder.paymentMethod === 'cash'
                                            ? 'Наличными'
                                            : selectedOrder.paymentMethod === 'card'
                                                ? 'Картой'
                                                : selectedOrder.paymentMethod === 'balance'
                                                    ? 'Из баланса'
                                                    : 'Не указан'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Статус оплаты:</span>{' '}
                                        {selectedOrder.paymentStatus === 'pending'
                                            ? 'Ожидает оплаты'
                                            : selectedOrder.paymentStatus === 'paid'
                                                ? 'Оплачено'
                                                : selectedOrder.paymentStatus === 'failed'
                                                    ? 'Ошибка оплаты'
                                                    : 'Неизвестно'}
                                    </p>
                                    {(selectedOrder as any)?.discountAmount && Number((selectedOrder as any).discountAmount) > 0 && (
                                        <p><span className="font-medium">Скидка:</span> {(selectedOrder as any).discountAmount} ₽</p>
                                    )}
                                    {(selectedOrder as any)?.finalTotal && (
                                        <p><span className="font-medium">Итоговая сумма:</span> {(selectedOrder as any).finalTotal} ₽</p>
                                    )}
                                    {(selectedOrder as any)?.referralCodeUsed && (
                                        <p><span className="font-medium">Реферальный код:</span> {(selectedOrder as any).referralCodeUsed}</p>
                                    )}
                                </div>
                            </div>

                            {/* Товары */}
                            <div>
                                <h4 className="font-medium mb-2">Товары</h4>
                                <div className="space-y-2">
                                    {(selectedOrder.items || []).map((item: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <div>
                                                <p className="font-medium">{item.title}</p>
                                                <p className="text-sm text-gray-600">Количество: {item.quantity}</p>
                                            </div>
                                            <p className="font-medium">{(Number(item.price) * Number(item.quantity)).toFixed(2)} ₽</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Итого */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Итого:</span>
                                    <span className="text-lg font-semibold">{selectedOrder.totalAmount} ₽</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export { OrderManagement };
export default OrderManagement;
