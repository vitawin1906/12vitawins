
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Gift, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const BlogAffiliatePromo = () => {
  return (
    <div className="my-8 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-2xl p-6 md:p-8 text-white">
      <div className="text-center mb-6">
        <Badge className="bg-white/20 text-white mb-4">Зарабатывайте с нами</Badge>
        <h3 className="text-2xl font-bold mb-4">Присоединяйтесь к нашей партнёрской программе</h3>
        <p className="text-emerald-100 max-w-2xl mx-auto">
          Начните зарабатывать с нашей многоуровневой партнёрской системой. Делитесь продуктами, 
          которые вам нравятся, и создавайте устойчивый доход с привлекательными комиссионными ставками.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <h4 className="text-lg font-semibold flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Структура комиссий
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Рефералы 1-го уровня
              </span>
              <span className="text-emerald-200 font-bold">20%</span>
            </div>
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Рефералы 2-го уровня
              </span>
              <span className="text-emerald-200 font-bold">5%</span>
            </div>
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Рефералы 3+ уровня
              </span>
              <span className="text-emerald-200 font-bold">1%</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-semibold flex items-center">
            <Gift className="h-5 w-5 mr-2" />
            Дополнительные преимущества
          </h4>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-emerald-300 rounded-full mt-2"></div>
              <div>
                <h5 className="font-medium">Система бонусных монет</h5>
                <p className="text-sm text-emerald-100">5% бонусных монет с личных покупок, 2% с покупок рефералов</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-emerald-300 rounded-full mt-2"></div>
              <div>
                <h5 className="font-medium">Лёгкий обмен</h5>
                <p className="text-sm text-emerald-100">Персональные реферальные ссылки и маркетинговые материалы</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-emerald-300 rounded-full mt-2"></div>
              <div>
                <h5 className="font-medium">Еженедельные выплаты</h5>
                <p className="text-sm text-emerald-100">Быстрые и надёжные выплаты комиссий</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg" 
          className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
          asChild
        >
          <Link to="/affiliate">
            <Share2 className="h-4 w-4 mr-2" />
            Начать зарабатывать
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default BlogAffiliatePromo;
