import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';

import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Leaf, 
  Factory, 
  Award, 
  Users, 
  Target, 
  Heart,
  CheckCircle,
  ArrowRight,
  Microscope,
  Truck,
  Shield,
  Recycle,
  Gift
} from 'lucide-react';

const IMG_0626 = "/uploads/assets/IMG_0626.jpg";
const IMG_0631 = "/uploads/assets/IMG_0631.webp";
const MushroomLab = "/uploads/assets/mushroom-lab.jpg";

const About = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const features = [
    {
      icon: Leaf,
      title: "Собственная ферма",
      description: "Выращиваем лечебные грибы в экологически чистых условиях"
    },
    {
      icon: Factory,
      title: "Производственная линия",
      description: "Современное оборудование для создания премиальных добавок"
    },
    {
      icon: Microscope,
      title: "Научный подход",
      description: "Каждый продукт разработан с участием ученых и врачей"
    },
    {
      icon: Shield,
      title: "Контроль качества",
      description: "Многоступенчатая система контроля на всех этапах производства"
    }
  ];

  const stats = [
    { number: "5+", label: "Лет опыта" },
    { number: "10000+", label: "Довольных клиентов" },
    { number: "50+", label: "Видов грибов" },
    { number: "99%", label: "Удовлетворенность" }
  ];

  const benefits = [
    "Натуральные ингредиенты высшего качества",
    "Научно обоснованные формулы",
    "Сертифицированное производство",
    "Экологически чистое сырье",
    "Персональный подход к здоровью",
    "Постоянная поддержка специалистов"
  ];

  const ecoInitiatives = [
    "100% переработанная упаковка",
    "Безотходное производство",
    "Возобновляемые источники энергии",
    "Органические методы выращивания",
    "Минимизация углеродного следа",
    "Локальные поставщики сырья"
  ];

  const charityProjects = [
    {
      title: "Фонд детского здоровья",
      description: "Поддержка медицинских учреждений и программ детского здравоохранения"
    },
    {
      title: "Программа 'Здоровое питание'",
      description: "Образовательные проекты о здоровом образе жизни в школах и университетах"
    },
    {
      title: "Экологические инициативы",
      description: "Участие в проектах по восстановлению лесов и очистке природных территорий"
    },
    {
      title: "Социальная поддержка",
      description: "Помощь пожилым людям и людям с ограниченными возможностями"
    }
  ];

  return (
    <div className="min-h-screen bg-white" itemScope itemType="https://schema.org/AboutPage">
      <SEOHead 
        title="О компании — VitaWin | Инновационная MLM компания"
        description="VitaWin — ведущая MLM компания в сфере здоровья с 5+ лет опыта. Научный подход, качественные витамины и БАД, партнерская программа. 10000+ довольных клиентов."
        keywords="vitawin компания, о компании, млм компания, витамины производство, качество, сертификаты, партнерская программа"
        ogTitle="О компании VitaWin — Инновационная MLM компания здоровья"
        ogDescription="Узнайте больше о VitaWin — MLM компании с научным подходом к здоровью. 5+ лет опыта, 10000+ клиентов, качественные витамины и БАД."
        ogUrl={`${window.location.origin}/about`}
        ogImage={`${window.location.origin}/vitawin-logo.png`}
        twitterTitle="О компании VitaWin — MLM здоровье"
        twitterDescription="Научный подход к здоровью. 5+ лет опыта, 10000+ клиентов."
      />
      <Header onCartClick={() => setIsCartOpen(true)} />
      {/* Hero Section with Video Background */}
      <section className="relative py-16 md:py-24 min-h-screen overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full">
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover"
          >
            {/* Заглушка для видео - используем изображение лаборатории */}
            <source src={MushroomLab} type="video/mp4" />
            {/* Fallback image if video doesn't load */}
            <img 
              src={MushroomLab} 
              alt="VitaWin laboratory background" 
              className="w-full h-full object-cover"
            />
          </video>
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>
        
        {/* Content overlay */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex items-center min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            <div className="text-center lg:text-left">
              <Badge className="bg-emerald-100 text-emerald-800 mb-4">
                О компании VitaWin
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                VitaWin - MLM компания нового покаления, объединяющая знания на стыке 
                <span className="text-emerald-400"> природы, науки и современных техологий</span>
              </h1>
              <p className="text-lg text-gray-200 mb-8 leading-relaxed">
                Мы объединили древние знания о целебных свойствах грибов с современными 
                научными технологиями и AI-инструментами чтобы создавать премиальные натуральные добавки 
                для вашего здоровья и долголетия.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link to="/store" className="flex items-center">
                    Начать путь к здоровью
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="border-white hover:bg-white hover:text-gray-900 text-[#000000]">
                  Узнать больше
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <img 
                  src={IMG_0626} 
                  alt="Наша ферма" 
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Наша ферма в действии</h3>
                <p className="text-gray-600">Экологически чистое выращивание лечебных грибов</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Mission Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Наша миссия
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Мы верим, что каждый человек заслуживает долгую, здоровую и активную жизнь. 
                Наша миссия — продлевать и улучшать качество жизни людей с помощью натуральных 
                премиальных продуктов, созданных на основе научного подхода и многовековых 
                традиций использования целебных грибов.
              </p>
              <div className="bg-emerald-50 rounded-2xl p-8">
                <div className="flex items-center justify-center mb-4">
                  <Heart className="h-12 w-12 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Здоровье через природу и науку
                </h3>
                <p className="text-gray-600">
                  Мы объединяем лучшее из двух миров: древние знания о природных средствах 
                  и современные научные методы для создания продуктов высочайшего качества.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Почему выбирают нас
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              От фермы до вашего дома — полный цикл контроля качества
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8 text-center">
                  <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Environmental Responsibility Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-green-100 text-green-800 mb-4">
                Экологическая ответственность
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                ZeroWaste производство
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Мы приверженцы экологически ответственного производства и минимизации 
                воздействия на окружающую среду. Наша цель — создавать продукты для здоровья, 
                не нанося вреда планете.
              </p>
              <div className="space-y-4">
                {ecoInitiatives.map((initiative, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Recycle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{initiative}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 bg-green-50 rounded-xl">
                <h4 className="text-lg font-semibold text-green-800 mb-2">99% переработанная упаковка</h4>
                <p className="text-green-700">
                  Вся наша упаковка производится из переработанных материалов и полностью 
                  подлежит вторичной переработке, способствуя созданию замкнутого цикла производства.
                </p>
              </div>
            </div>
            <div className="relative">
              <img 
                src={IMG_0631} 
                alt="Экологичное производство" 
                className="w-full h-96 object-cover rounded-2xl shadow-xl"
              />
              <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold">ZeroWaste</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="py-16 md:py-20 bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Цифры говорят сами за себя
            </h2>
            <p className="text-emerald-100 text-lg">
              Результаты нашей работы за годы деятельности
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-emerald-100 text-lg">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Charity Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-blue-100 text-blue-800 mb-4">
              Благотворительность
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Наша социальная ответственность
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Благотворительная деятельность закреплена в уставе нашей компании. 
              Мы активно участвуем в социальных проектах и поддерживаем различные 
              благотворительные фонды, направленные на улучшение здоровья и качества жизни людей.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {charityProjects.map((project, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                    <Gift className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {project.title}
                  </h3>
                  <p className="text-gray-600">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Наш вклад в благотворительность
            </h3>
            <p className="text-gray-600 mb-6">
              Ежегодно мы направляем часть прибыли на благотворительные цели, 
              поддерживая проекты в области здравоохранения, экологии и социальной помощи.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">2M₽</div>
                <div className="text-gray-600">Ежегодная поддержка</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">15+</div>
                <div className="text-gray-600">Благотворительных проектов</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">5000+</div>
                <div className="text-gray-600">Помощь получили</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Production Process */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Наш производственный процесс
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Полный цикл производства от выращивания до упаковки под строгим контролем качества
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Leaf className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">1. Выращивание</h3>
              <p className="text-gray-600">
                Собственная ферма с контролируемыми условиями для выращивания 
                50+ видов лечебных грибов
              </p>
            </div>

            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Factory className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">2. Производство</h3>
              <p className="text-gray-600">
                Современная производственная линия с экстракцией активных веществ 
                и создание премиальных формул
              </p>
            </div>

            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Truck className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">3. Упаковка и доставка</h3>
              <p className="text-gray-600">
                Герметичная упаковка в асептических условиях и быстрая доставка 
                до вашего дома
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Benefits Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Что вы получаете, выбирая нас
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Мы предлагаем не просто продукты, а комплексный подход к вашему здоровью
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src={MushroomLab}
                alt="Качественные продукты"
                className="w-full h-96 object-cover rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-emerald-600 to-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Готовы начать путь к здоровой жизни?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Присоединяйтесь к тысячам людей, которые уже улучшили качество своей жизни 
            с помощью наших натуральных продуктов
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
              <Link to="/store" className="flex items-center">
                Посмотреть каталог
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-emerald-600">
              Связаться с нами
            </Button>
          </div>
          
          <div className="mt-12 pt-8 border-t border-emerald-500">
            <p className="text-emerald-100 text-sm">
              🎁 Новым клиентам — скидка 15% на первый заказ
            </p>
          </div>
        </div>
      </section>
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default About;
