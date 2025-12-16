
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import AccountOverview from '../components/account/AccountOverview';
import BalanceSection from '../components/account/BalanceSection';
import AddressManagement from '../components/account/AddressManagement';

import ReferralProgram from '../components/account/ReferralProgram';
import AccountSettings from '../components/account/AccountSettings';
import OrderHistory from '../components/account/OrderHistory';
import MlmLevelSection from '../components/account/MlmLevelSection';
import BonusPreferences from '../components/BonusPreferences';
import MyNetwork from '../components/MyNetwork';
import { MyMatrixSection } from '../components/account/MyMatrixSection';

import { useAuthStore } from '@/stores/authStore';
import { useTelegramBotLoginMutation } from '@/store/api/domains/authApi';
import {useNavigate, useSearchParams} from "react-router-dom";

const Account = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [telegramUser, setTelegramUser] = useState<any>(null);

    const user     = useAuthStore(s => s.user);
    const setUser  = useAuthStore(s => s.setUser);
    const setTokens = useAuthStore(s => s.setTokens);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [telegramBotLogin] = useTelegramBotLoginMutation();

    useEffect(() => {
        const tgId = searchParams.get('tg_id');
        if (!tgId && !user) {
            navigate('/', { replace: true });
        }
    }, [user, searchParams, navigate]);

  useEffect(() => {
    // Проверяем URL параметры для автоматического входа через Telegram
    const tgId = searchParams.get('tg_id');
    const tgFirstName = searchParams.get('first_name');
    const tgUsername = searchParams.get('username');

    if (tgId && tgFirstName) {
      // Создаем объект пользователя Telegram
      const tgUser = {
        id: parseInt(tgId),
        first_name: decodeURIComponent(tgFirstName),
        username: tgUsername || null
      };

      setTelegramUser(tgUser);

      // Пытаемся авторизоваться через Telegram
      authenticateWithTelegram(tgUser);

      // Очищаем URL от параметров
      window.history.replaceState({}, '', '/account');
    }
  }, [searchParams]);

    const authenticateWithTelegram = async (tgUser: any) => {
        try {
            const res = await telegramBotLogin({
                telegramId: String(tgUser.id),
                firstName: tgUser.first_name,
                username: tgUser.username || undefined,
            }).unwrap();

            // Normalize response (authToken или accessToken)
            const accessToken = res.accessToken || res.authToken || (res as any).token;
            if (accessToken) {
                setTokens(accessToken, res.refreshToken);
            }

            if (res.user) {
                setUser(res.user);
            }
        } catch (e) {
            console.error('Telegram auth error:', e);
        }
    };


  const currentUser = user || telegramUser;

  return (
    <div className="min-h-screen bg-gray-50" itemScope itemType="https://schema.org/ProfilePage">
      <SEOHead 
        title="Личный кабинет — VitaWin | Управление аккаунтом"
        description="Личный кабинет VitaWin: управление заказами, реферальная программа, история покупок, настройки профиля. Отслеживайте кешбэк и бонусы."
        keywords="личный кабинет, аккаунт vitawin, заказы, реферальная программа, кешбэк, бонусы, профиль пользователя"
        ogTitle="Личный кабинет VitaWin"
        ogDescription="Управляйте заказами, отслеживайте кешбэк и развивайте реферальную сеть в личном кабинете VitaWin."
        ogUrl={`${window.location.origin}/account`}
        ogImage={`${window.location.origin}/vitawin-logo.png`}
        twitterTitle="Личный кабинет VitaWin"
        twitterDescription="Управление заказами, кешбэк и реферальная программа."
        noindex={true}
      />
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Личный кабинет</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
            Добро пожаловать, {currentUser?.first_name || currentUser?.name || 'Пользователь'}, мы тебя <span className="text-[20px] md:text-[24px]">🫶🏻</span>
          </p>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
          <div className="bg-white shadow-sm rounded-lg p-2">
            {/* Первая строка навигации */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="overview" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Обзор
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="orders" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Заказы
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="payment" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Оплата
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="addresses" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Адреса
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="referral" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Рефералы
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Вторая строка навигации */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="network" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Моя сеть
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="matrix" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                  Матрица
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="mlm" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  MLM Уровни
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="bonus-preferences" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Свобода выбора
                </TabsTrigger>
              </TabsList>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="settings" className="w-full text-xs md:text-sm px-2 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                  Настройки
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <TabsContent value="overview" className="mt-0 pt-2">
              <AccountOverview />
            </TabsContent>
            
            <TabsContent value="orders" className="mt-0 pt-2">
              <OrderHistory />
            </TabsContent>
            

            <TabsContent value="payment" className="mt-0 pt-2">
              <BalanceSection />
            </TabsContent>
            
            <TabsContent value="addresses" className="mt-0 pt-2">
              <AddressManagement />
            </TabsContent>
            
            <TabsContent value="referral" className="mt-0 pt-2">
              <ReferralProgram />
            </TabsContent>
            
            <TabsContent value="network" className="mt-0 pt-2">
              <MyNetwork />
            </TabsContent>

            <TabsContent value="matrix" className="mt-0 pt-2">
              <MyMatrixSection />
            </TabsContent>

            <TabsContent value="mlm" className="mt-0 pt-2">
              <MlmLevelSection />
            </TabsContent>

            <TabsContent value="bonus-preferences" className="mt-0 pt-2">
              <BonusPreferences />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 pt-2">
              <AccountSettings />
            </TabsContent>
          </div>
        </Tabs>
      </main>
      
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default Account;
