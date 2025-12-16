import { useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import SEOHead from '../components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductManagement } from '@/components/admin/ProductManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { Analytics } from '@/components/admin/Analytics';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { OrderManagement } from '@/components/admin/OrderManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { BlogManagement } from '@/components/admin/BlogManagement';
import { ContactManagement } from '@/components/admin/ContactManagement';
import ReviewsManagement from '../components/admin/ReviewsManagement';
import { PaymentSettings } from '../components/admin/PaymentSettings';
import AdminSessionMonitor from '../components/admin/AdminSessionMonitor';
import SecuritySection from '../components/admin/SecuritySection';
import ReferralSettings from '../components/admin/ReferralSettings';
import MLMNetworkManagement from '../components/admin/MLMNetworkManagement';
import LedgerManagement from '../components/admin/LedgerManagement';
import { NetworkFundDashboard } from '../components/admin/NetworkFundDashboard';
import { PartnerUpgradeDashboard } from '../components/admin/PartnerUpgradeDashboard';
import {
    Package, BarChart3, Settings, ShoppingCart, Users, FolderOpen,
    FileText, MapPin, CreditCard, Lock, Shield, Network, LogOut, Home, Wallet, MessageSquare, DollarSign, TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';

const Admin = () => {
    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/admin/logout', {
                method: 'POST',
                credentials: 'include',
            });
            // Удаляем токены и редиректим
            document.cookie = 'admin_session=; Max-Age=0; path=/;';
            document.cookie = 'adminToken=; Max-Age=0; path=/;';
            // window.location.href = '/admin/login';
        } catch (err) {
            console.error('Logout error:', err);
        }
    }, []);

    const goHome = useCallback(() => {
        window.location.href = '/';
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <SEOHead
                title="Админка — VitaWin"
                description="Административная панель VitaWin. Доступ только для авторизованных администраторов."
                ogTitle="Админка — VitaWin"
                ogDescription="Административная панель VitaWin"
                ogUrl={`${window.location.origin}/admin`}
                ogImage={`${window.location.origin}/vitawin-logo.png`}
                noindex={true}
            />

            <div className="max-w-7xl mx-auto">
                {/* Верхняя панель */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Панель администратора
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Управление сайтом, товарами и аналитикой
                        </p>
                    </div>

                    {/* Кнопки справа */}
                    <div className="flex gap-3">
                        <Button
                            onClick={goHome}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            На сайт
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            className="flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Выйти
                        </Button>
                    </div>
                </div>

                {/* Основное содержимое */}
                <Tabs defaultValue="analytics" className="w-full">
                    <div className="border-b mb-6">
                        <TabsList className="h-auto p-4 bg-transparent">
                            <div className="space-y-4 w-full">
                                {/* Основное управление */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Управление</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <TabsTrigger value="analytics" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <BarChart3 className="h-4 w-4" />
                                            Аналитика
                                        </TabsTrigger>
                                        <TabsTrigger value="orders" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <ShoppingCart className="h-4 w-4" />
                                            Заказы
                                        </TabsTrigger>
                                        <TabsTrigger value="products" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Package className="h-4 w-4" />
                                            Товары
                                        </TabsTrigger>
                                        <TabsTrigger value="categories" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <FolderOpen className="h-4 w-4" />
                                            Категории
                                        </TabsTrigger>
                                        <TabsTrigger value="users" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Users className="h-4 w-4" />
                                            Пользователи
                                        </TabsTrigger>
                                        <TabsTrigger value="blog" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <FileText className="h-4 w-4" />
                                            Блог
                                        </TabsTrigger>
                                        <TabsTrigger value="reviews" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Отзывы
                                        </TabsTrigger>
                                        <TabsTrigger value="mlm-network" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Network className="h-4 w-4" />
                                            MLM Сеть
                                        </TabsTrigger>
                                        <TabsTrigger value="ledger" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Wallet className="h-4 w-4" />
                                            Ledger
                                        </TabsTrigger>
                                        <TabsTrigger value="network-fund" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <DollarSign className="h-4 w-4" />
                                            Сетевой фонд
                                        </TabsTrigger>
                                        <TabsTrigger value="partner-upgrade" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Partner Upgrade
                                        </TabsTrigger>
                                    </div>
                                </div>

                                {/* Система и безопасность */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Система</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <TabsTrigger value="session-monitor" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Shield className="h-4 w-4" />
                                            Мониторинг
                                        </TabsTrigger>
                                        <TabsTrigger value="security" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Lock className="h-4 w-4" />
                                            Безопасность
                                        </TabsTrigger>
                                        <TabsTrigger value="settings" className="flex items-center gap-2 text-sm px-3 py-2">
                                            <Settings className="h-4 w-4" />
                                            Настройки
                                        </TabsTrigger>
                                    </div>
                                </div>
                            </div>
                        </TabsList>
                    </div>

                    {/* Контент */}
                    <TabsContent value="analytics"><Analytics /></TabsContent>
                    <TabsContent value="products"><ProductManagement /></TabsContent>
                    <TabsContent value="categories"><CategoryManagement /></TabsContent>
                    <TabsContent value="blog"><BlogManagement /></TabsContent>
                    <TabsContent value="reviews"><ReviewsManagement /></TabsContent>
                    <TabsContent value="orders"><OrderManagement /></TabsContent>
                    <TabsContent value="users"><UserManagement /></TabsContent>
                    <TabsContent value="mlm-network"><MLMNetworkManagement /></TabsContent>
                    <TabsContent value="ledger"><LedgerManagement /></TabsContent>
                    <TabsContent value="network-fund"><NetworkFundDashboard /></TabsContent>
                    <TabsContent value="partner-upgrade"><PartnerUpgradeDashboard /></TabsContent>
                    <TabsContent value="session-monitor"><AdminSessionMonitor /></TabsContent>
                    <TabsContent value="security"><SecuritySection /></TabsContent>
                    <TabsContent value="settings">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Платежные системы
                                        </CardTitle>
                                        <CardDescription>
                                            Настройка платежных терминалов и методов оплаты
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <PaymentSettings />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Реферальная программа
                                        </CardTitle>
                                        <CardDescription>
                                            Настройка процентных ставок для реферальной программы
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ReferralSettings />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5" />
                                            Контактная информация
                                        </CardTitle>
                                        <CardDescription>
                                            Управление контактными данными
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ContactManagement />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Settings className="h-5 w-5" />
                                            Общие настройки
                                        </CardTitle>
                                        <CardDescription>
                                            Системные настройки и конфигурация
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <AdminSettings />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Admin;
