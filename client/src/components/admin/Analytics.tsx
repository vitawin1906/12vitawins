import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, Target, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetMyStatsQuery, useGetAllUsersQuery, useGetAllOrdersQuery } from '@/store/api/domains';

type CategoryDatum = { name: string; value: number; color?: string };

const Analytics = () => {
    const [timeFilter, setTimeFilter] = useState('today');

    // Загрузка реальной статистики из API
    const { data: stats = {}, isLoading: statsLoading } = useGetMyStatsQuery();
    const { data: users = [], isLoading: usersLoading } = useGetAllUsersQuery();
    const { data: orders = [], isLoading: ordersLoading } = useGetAllOrdersQuery();

    const isLoading = statsLoading || usersLoading || ordersLoading;

    const paidOrders = orders.filter((order: any) => order.payment_status === 'paid');
    const todayOrders = paidOrders.filter(
        (order: any) => new Date(order.created_at).toDateString() === new Date().toDateString(),
    );

    const currentMetrics = {
        sales: todayOrders.length,
        revenue: todayOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0),
        orders: todayOrders.length,
        avgOrder:
            todayOrders.length > 0
                ? todayOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0) /
                todayOrders.length
                : 0,
        totalOrders: paidOrders.length,
        totalRevenue: paidOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0),
        totalUsers: users.length,
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Загрузка аналитики...</p>
                </div>
            </div>
        );
    }

    const salesChange = { value: '0.0', isPositive: true };
    const revenueChange = { value: '0.0', isPositive: true };
    const ordersChange = { value: '0.0', isPositive: true };

    const getTimeFilterLabel = (filter: string) => {
        switch (filter) {
            case 'today':
                return 'сегодня';
            case 'week':
                return 'за неделю';
            case 'month':
                return 'за месяц';
            default:
                return 'сегодня';
        }
    };

    const getPreviousLabel = (filter: string) => {
        switch (filter) {
            case 'today':
                return 'вчера';
            case 'week':
                return 'пред. неделю';
            case 'month':
                return 'пред. месяц';
            default:
                return 'вчера';
        }
    };

    const keyMetrics = [
        {
            title: `Продаж ${getTimeFilterLabel(timeFilter)}`,
            value: currentMetrics.sales.toString(),
            change: `${salesChange.isPositive ? '+' : '-'}${salesChange.value}%`,
            trend: salesChange.isPositive ? 'up' : 'down',
            icon: ShoppingCart,
            description: `Количество завершенных продаж за ${getPreviousLabel(timeFilter)}`,
        },
        {
            title: `Выручка ${getTimeFilterLabel(timeFilter)}`,
            value: `₽${Math.round(currentMetrics.revenue).toLocaleString()}`,
            change: `${revenueChange.isPositive ? '+' : '-'}${revenueChange.value}%`,
            trend: revenueChange.isPositive ? 'up' : 'down',
            icon: DollarSign,
            description: `Общая сумма оплаченных заказов за ${getPreviousLabel(timeFilter)}`,
        },
        {
            title: `Заказов ${getTimeFilterLabel(timeFilter)}`,
            value: currentMetrics.orders.toString(),
            change: `${ordersChange.isPositive ? '+' : '-'}${ordersChange.value}%`,
            trend: ordersChange.isPositive ? 'up' : 'down',
            icon: Target,
            description: `Общее количество заказов за ${getPreviousLabel(timeFilter)}`,
        },
        {
            title: 'Средний чек',
            value: `₽${Math.round(currentMetrics.avgOrder).toLocaleString()}`,
            change: '+0%',
            trend: 'up',
            icon: Users,
            description: 'Средняя сумма заказа',
        },
    ];

    const monthlyStats = orders.reduce((acc: any[], order: any) => {
        const month = new Date(order.created_at).getMonth();
        const monthName = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][month];

        const existing = acc.find((item) => item.month === monthName);
        if (existing) {
            existing.revenue += parseFloat(order.total || 0);
            existing.orders += 1;
        } else {
            acc.push({
                month: monthName,
                revenue: parseFloat(order.total || 0),
                orders: 1,
            });
        }
        return acc;
    }, []);

    const revenueData = monthlyStats;

    // Категории (пока пусто, но типизировано)
    const categoryData: CategoryDatum[] = [];

    // CSI (пока пусто)
    const csiData: Array<{ period: string; satisfaction: number }> = [];

    const extendedMetrics = [
        {
            title: 'Всего пользователей',
            value: currentMetrics.totalUsers.toString(),
            change: '+0%',
            trend: 'up',
            icon: Users,
            description: 'Общее количество зарегистрированных пользователей',
        },
        {
            title: 'Индекс лояльности клиентов (NPS)',
            value: '67',
            change: '+5',
            trend: 'up',
            icon: Users,
            description: 'Net Promoter Score',
        },
    ];

    // Функция-лейбл для Pie (исправляет TS18046)
    const renderCategoryLabel = (props: { name?: string; percent?: number }) => {
        const name = props.name ?? '—';
        const percent = props.percent ?? 0;
        return `${name}: ${(percent * 100).toFixed(0)}%`;
    };

    return (
        <div className="space-y-6">
            {/* Time Filter */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Аналитика продаж</h2>
                    <p className="text-gray-600">Основные показатели эффективности</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Период" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Сегодня</SelectItem>
                            <SelectItem value="week">Неделя</SelectItem>
                            <SelectItem value="month">Месяц</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Sales Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {keyMetrics.map((metric, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                            <metric.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <div
                                className={`flex items-center text-xs ${
                                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                {metric.trend === 'up' ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {metric.change} к {getPreviousLabel(timeFilter)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Extended Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {extendedMetrics.map((metric, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                            <metric.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <div
                                className={`flex items-center text-xs ${
                                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                {metric.trend === 'up' ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {metric.change} за месяц
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Выручка и заказы</CardTitle>
                        <CardDescription>Динамика за последние 6 месяцев</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="revenue" fill="#8b5cf6" name="Выручка (₽)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Распределение по категориям</CardTitle>
                        <CardDescription>Доля продаж по категориям товаров</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={renderCategoryLabel} // ← фикс: типизированный лейбл
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Customer Satisfaction Index */}
                <Card>
                    <CardHeader>
                        <CardTitle>Индекс удовлетворенности клиентов (CSI)</CardTitle>
                        <CardDescription>Средняя оценка по 5-балльной шкале</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={csiData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis domain={[0, 5]} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="satisfaction" stroke="#10b981" strokeWidth={2} name="Удовлетворенность" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Additional Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Дополнительные метрики</CardTitle>
                        <CardDescription>Другие важные показатели</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Конверсия сайта</span>
                            <span className="text-sm text-green-600">3.2%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Пожизненная ценность клиента (LTV)</span>
                            <span className="text-sm">₽13,500</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Стоимость привлечения клиента (CAC)</span>
                            <span className="text-sm">₽1,350</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Возврат товаров</span>
                            <span className="text-sm text-red-600">2.1%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Время на сайте</span>
                            <span className="text-sm">4:32 мин</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Отказы</span>
                            <span className="text-sm text-orange-600">45.2%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Повторные покупки</span>
                            <span className="text-sm text-green-600">62.8%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export { Analytics };
