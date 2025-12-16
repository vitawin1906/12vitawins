
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import SEOHead from '../components/SEOHead';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  MessageCircle, 
  Coins, 
  TrendingUp,
  Star,
  Heart,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  Award,
  Bot,
  Smartphone,
  UserPlus,
  BarChart3
} from 'lucide-react';

const Affiliate = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const referralLevels = [
    {
      level: "1 уровень",
      percentage: "20%",
      description: "Прямые рефералы",
      color: "bg-emerald-500",
      icon: Users
    },
    {
      level: "2 уровень", 
      percentage: "5%",
      description: "Рефералы ваших рефералов",
      color: "bg-blue-500",
      icon: TrendingUp
    },
    {
      level: "3 уровень",
      percentage: "1%", 
      description: "Рефералы 2-го уровня",
      color: "bg-purple-500",
      icon: Star
    }
  ];

  const partners = [
    {
      title: "Блогеры",
      description: "Lifestyle и health блогеры с активной аудиторией",
      icon: Heart,
      example: "50-500К подписчиков"
    },
    {
      title: "Врачи",
      description: "Нутрициологи, диетологи, эндокринологи",
      icon: Award,
      example: "Медицинские специалисты"
    },
    {
      title: "Спортсмены",
      description: "Профессиональные и любительские атлеты",
      icon: Zap,
      example: "Фитнес тренеры"
    },
    {
      title: "Консультанты",
      description: "Консультанты по здоровому образу жизни",
      icon: Target,
      example: "Health коучи"
    }
  ];

  const telegramFeatures = [
    "🔐 Авторизация через Telegram",
    "📊 Статистика заказов в реальном времени",
    "👥 Управление рефералами",
    "💰 Отслеживание комиссий",
    "📱 Уведомления о новых заказах",
    "🎯 Персональные промокоды"
  ];

  const earningsExample = {
    referrals: 100,
    averageOrder: 5000,
    totalRevenue: 500000,
    level1: 100000, // 20% - target amount
    level2: 25000,  // 5% - calculated proportionally 
    level3: 5000,   // 1% - calculated proportionally
    totalEarnings: 130000 // 26% total (20+5+1)
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead 
        title="Партнерская программа VitaWin — Зарабатывайте до 26% с каждого заказа"
        description="Присоединяйтесь к партнерской программе VitaWin. Трехуровневая система вознаграждений: 20% + 5% + 1%. Управление через Telegram бот. Еженедельные выплаты."
        keywords="партнерская программа, реферальная программа, vitawin, заработок, комиссия, MLM, витамины, БАД, телеграм бот"
        ogTitle="Партнерская программа VitaWin — Зарабатывайте до 26%"
        ogDescription="Трехуровневая система вознаграждений: 20% + 5% + 1%. Управление через Telegram бот. Присоединяйтесь к тысячам успешных партнеров."
        ogUrl={`${window.location.origin}/affiliate`}
        ogImage={`${window.location.origin}/vitawin-logo.png`}
        twitterTitle="Партнерская программа VitaWin — до 26% комиссии"
        twitterDescription="Трехуровневая система вознаграждений. Управление через Telegram бот. Еженедельные выплаты."
      />
      <Header onCartClick={() => setIsCartOpen(true)} />
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 bg-gradient-to-br from-emerald-50 to-green-100 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <Badge className="bg-emerald-100 text-emerald-800 mb-6 text-sm md:text-base">
              💰 Партнёрская программа VitaWin
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Зарабатывайте до 
              <span className="text-emerald-600"> 26% с каждого заказа</span>
            </h1>
            <p className="text-base md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Присоединяйтесь к нашей партнёрской программе и получайте стабильный доход, 
              рекомендуя качественные продукты для здоровья через удобный Telegram бот
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-sm md:text-base">
                <MessageCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Подключиться через Telegram
              </Button>
              <Button variant="outline" size="lg" className="text-sm md:text-base">
                Узнать подробнее
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center mb-3">
                <Bot className="h-8 w-8 md:h-12 md:w-12 text-emerald-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">Всё через Telegram</h3>
              <p className="text-sm md:text-base text-gray-600">Управление, статистика и выплаты в одном боте</p>
            </div>
          </div>
        </div>
      </section>
      {/* Referral Levels */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
              Трёхуровневая система вознаграждений
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Получайте комиссию не только с прямых рефералов, но и с их рефералов
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {referralLevels.map((level, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <CardContent className="p-6 md:p-8 text-center relative">
                  <div className={`${level.color} rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mx-auto mb-4 md:mb-6`}>
                    <level.icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {level.level}
                  </h3>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-4">
                    {level.percentage}
                  </div>
                  <p className="text-sm md:text-base text-gray-600">
                    {level.description}
                  </p>
                  <Badge className={`${level.color} text-white mt-4`}>
                    Комиссия с каждого заказа
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Telegram Bot Features */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
                Telegram бот — ваш личный помощник
              </h2>
              <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8">
                Весь функционал партнёрской программы доступен через удобный Telegram бот. 
                Никаких сложных интерфейсов — только простое и понятное управление.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                {telegramFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                <MessageCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Запустить бота
              </Button>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 md:p-8 text-white">
                <div className="flex items-center mb-4 md:mb-6">
                  <Smartphone className="h-8 w-8 md:h-10 md:w-10 mr-3" />
                  <span className="text-lg md:text-xl font-semibold">..Vitawin_Bot</span>
                </div>
                <div className="space-y-3 md:space-y-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 md:p-4">
                    <div className="text-sm md:text-base opacity-90">💰 Ваши комиссии сегодня:</div>
                    <div className="text-xl md:text-2xl font-bold">+2,450 ₽</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-3 md:p-4">
                    <div className="text-sm md:text-base opacity-90">👥 Новые рефералы:</div>
                    <div className="text-xl md:text-2xl font-bold">+3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Earnings Calculator */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
              Сколько можно заработать?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Пример расчёта при привлечении 100 человек со средним чеком 5,000 ₽
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-6 md:p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {earningsExample.referrals}
                </div>
                <div className="text-sm md:text-base text-gray-600">человек</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {earningsExample.averageOrder.toLocaleString()} ₽
                </div>
                <div className="text-sm md:text-base text-gray-600">средний чек</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {earningsExample.totalRevenue.toLocaleString()} ₽
                </div>
                <div className="text-sm md:text-base text-gray-600">общий оборот</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-emerald-600 mb-2">
                  {earningsExample.totalEarnings.toLocaleString()} ₽
                </div>
                <div className="text-sm md:text-base text-gray-600">ваш доход</div>
              </div>
            </div>

            <div className="mt-8 md:mt-12">
              <h3 className="text-lg md:text-xl font-semibold text-center mb-6 md:mb-8">
                Детализация по уровням:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white rounded-xl p-4 md:p-6 text-center">
                  <div className="text-lg md:text-xl font-bold text-emerald-600 mb-2">
                    {earningsExample.level1.toLocaleString()} ₽
                  </div>
                  <div className="text-sm md:text-base text-gray-600">1 уровень (20%)</div>
                </div>
                <div className="bg-white rounded-xl p-4 md:p-6 text-center">
                  <div className="text-lg md:text-xl font-bold text-blue-600 mb-2">
                    {earningsExample.level2.toLocaleString()} ₽
                  </div>
                  <div className="text-sm md:text-base text-gray-600">2 уровень (5%)</div>
                </div>
                <div className="bg-white rounded-xl p-4 md:p-6 text-center">
                  <div className="text-lg md:text-xl font-bold text-purple-600 mb-2">
                    {earningsExample.level3.toLocaleString()} ₽
                  </div>
                  <div className="text-sm md:text-base text-gray-600">3 уровень (1%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Partners Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
              Кто наши партнёры
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Мы работаем с экспертами в области здоровья и влиятельными личностями
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {partners.map((partner, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6 md:p-8 text-center">
                  <div className="bg-emerald-100 rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <partner.icon className="h-8 w-8 md:h-10 md:w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">
                    {partner.title}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                    {partner.description}
                  </p>
                  <Badge variant="outline" className="text-xs md:text-sm">
                    {partner.example}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Sharing Methods */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 md:mb-6">
              Как рассказывать о продукте
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Делитесь информацией естественно и искренне
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-gradient-to-br from-pink-50 to-rose-100 rounded-2xl p-6 md:p-8">
              <Heart className="h-8 w-8 md:h-10 md:w-10 text-pink-600 mb-4 md:mb-6" />
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Личный блог</h3>
              <p className="text-sm md:text-base text-gray-600">
                Расскажите о своём опыте использования продуктов VitaWin в социальных сетях
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 md:p-8">
              <Users className="h-8 w-8 md:h-10 md:w-10 text-blue-600 mb-4 md:mb-6" />
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Друзья и семья</h3>
              <p className="text-sm md:text-base text-gray-600">
                Поделитесь с близкими людьми, которым важно здоровье и качество жизни
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 md:p-8">
              <BarChart3 className="h-8 w-8 md:h-10 md:w-10 text-green-600 mb-4 md:mb-6" />
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Профессиональные каналы</h3>
              <p className="text-sm md:text-base text-gray-600">
                Используйте экспертные знания для рекомендаций в профессиональном контексте
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-gradient-to-r from-emerald-600 to-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-6">
            Готовы начать зарабатывать?
          </h2>
          <p className="text-lg md:text-xl text-emerald-100 mb-6 md:mb-8">
            Присоединяйтесь к партнёрской программе VitaWin уже сегодня и получите 
            первые комиссии в течение недели
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/account">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
                <MessageCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Подключиться через Telegram
              </Button>
            </Link>
            <Link to="/store">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-emerald-600 bg-[#e50fff]">
                Посмотреть продукты
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-center mb-3 md:mb-4">
              <Coins className="h-6 w-6 md:h-8 md:w-8 text-yellow-300 mr-2" />
              <span className="text-lg md:text-xl font-semibold text-white">Специальное предложение</span>
            </div>
            <p className="text-sm md:text-base text-emerald-100">
              🎁 Первые 100 партнёров получают бонус +5% к комиссии на первый месяц
            </p>
          </div>
        </div>
      </section>
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default Affiliate;
