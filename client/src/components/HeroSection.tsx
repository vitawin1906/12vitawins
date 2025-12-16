import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Star, Shield, Award, Truck } from 'lucide-react';
const HeroSection = () => {
  return (
    <section className="hero-gradient py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-sm font-medium">✨ Премиальное качество, современные технологии и научный подход</Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                VitaWin - Ваш надёжный партнёр в области{' '}
                <span className="text-emerald-600">премиальных</span>{' '}
                витаминов, БАД и пищевых добавок
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Откройте широкий ассортимент научно обоснованных добавок, 
                созданных для поддержки вашего здоровья и активного образа жизни.
                <br />
                <span className="font-semibold text-emerald-700">
                  Наша миссия - улучшать и продлевать качество жизни людей по всему миру!
                </span>
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
              <div className="text-center">
                <Shield className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">ЕАС</p>
                <p className="text-xs text-gray-600">Сертифицировано</p>
              </div>
              <div className="text-center">
                <Award className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">СГР</p>
                <p className="text-xs text-gray-600">Зарегистрировано</p>
              </div>
              <div className="text-center">
                <Star className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">4.8/5</p>
                <p className="text-xs text-gray-600">Рейтинг</p>
              </div>
              <div className="text-center">
                <Truck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Бесплатная*</p>
                <p className="text-xs text-gray-600">Доставка</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg">
                <Link to="/store">Купить сейчас</Link>
              </Button>
              <Button variant="outline" size="lg" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 px-8 py-4 text-lg">
                <Link to="/about">Узнать больше</Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="font-medium text-gray-900">2 000+</span>
                <span>довольных клиентов</span>
              </div>
              <div className="h-4 border-l border-gray-300"></div>
              <div>
                <span className="font-medium text-gray-900">100%</span>
                <span> натуральные ингредиенты</span>
              </div>
            </div>
          </div>

          {/* Right Content - Affiliate Program Chart */}
          <div className="relative">
            <Card className="bg-white shadow-xl border-0 max-w-md mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Партнерская программа</h3>
                
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-800 font-medium">Партнер 1-го уровня</span>
                    <span className="text-2xl font-bold text-emerald-500">25%*</span>
                  </div>
                  
                  <div className="rounded-lg p-4 flex justify-between items-center bg-[#ffedd5]">
                    <span className="text-gray-800 font-medium">Партнер 2-го уровня</span>
                    <span className="text-2xl font-bold text-emerald-500">5%</span>
                  </div>
                  
                  <div className="rounded-lg p-4 flex justify-between items-center bg-[#e7f3f9]">
                    <span className="text-gray-800 font-medium">Прибыль в сеть</span>
                    <span className="text-2xl font-bold text-emerald-500">&gt;50%*</span>
                  </div>
                  
                  <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-800 font-medium">Бонус с покупки</span>
                    <span className="text-xl font-bold text-emerald-500">5% монет</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full opacity-60"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-100 rounded-full opacity-40"></div>
            <div className="absolute top-1/2 -right-8 w-16 h-16 bg-orange-100 rounded-full opacity-50"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;