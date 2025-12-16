
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Crown, Gift, Share2, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const AffiliateSection = () => {
  const affiliateLevels = [
    {
      icon: Users,
      title: "Партнеры 1-го уровня",
      description: "Прямые партнеры которых вы привели",
      percentage: "20%",
      color: "text-emerald-500"
    },
    {
      icon: TrendingUp,
      title: "Партнеры 2-го уровня", 
      description: "Партнеры от ваших партнеров",
      percentage: "5%",
      color: "text-emerald-500"
    },
    {
      icon: Crown,
      title: "Партнер 3го уровня",
      description: "Последующие уровни партнеров", 
      percentage: "9%",
      color: "text-emerald-500"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-100 text-emerald-600 border-emerald-200">
            Зарабатывайте с нами
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Присоединяйтесь к нашей партнерской программе
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Начните зарабатывать с нашей многоуровневой партнерской системой. Делитесь продуктами, которые вам нравятся, и создавайте устойчивый доход с привлекательными комиссионными ставками.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 mb-16">
          {/* Commission Structure */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Структура вознаграждений</h3>
            <div className="space-y-4">
              {affiliateLevels.map((level, index) => (
                <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <level.icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">{level.title}</h4>
                          <p className="text-sm text-gray-500">{level.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${level.color}`}>
                          {level.percentage}
                        </div>
                        <p className="text-xs text-gray-400">Вознаграждение</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Benefits */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Дополнительные преимущества</h3>
            
            {/* Bonus Coins System */}
            <Card className="border border-gray-200 shadow-sm mb-6">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Gift className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900">Система бонусных монет</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Личные покупки</span>
                    <span className="text-sm font-semibold text-emerald-500">5% бонусных монет</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Распределение в сеть</span>
                    <span className="text-sm font-semibold text-emerald-500">до 50% от прибыли компании</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Используйте бонусные монеты для будущих покупок или конвертируйте в денежные награды!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Easy Sharing & Weekly Payouts */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Share2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Легкий обмен</h4>
                  <p className="text-xs text-gray-500">
                    Персональные реферальные ссылки и маркетинговые материалы
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Еженедельные выплаты</h4>
                  <p className="text-xs text-gray-500">
                    Быстрые и надежные выплаты вознаграждений
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Готовы начать зарабатывать?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам партнеров, которые уже зарабатывают с нашей программой. Начните делиться продуктами, в которые вы верите, и создайте свой доход уже сегодня.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4">
                    <Link to="/login">
                        Присоединиться к партнерской программе
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 px-8 py-4">
                    <Link to="/about">
                        Узнать больше
                    </Link>
                </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateSection;
