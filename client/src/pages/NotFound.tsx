import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, ShoppingBag, Info, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';

const NotFound = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            {/* 404 заголовок */}
            <div className="mb-8">
              <h1 className="text-8xl font-bold text-emerald-600 mb-4">404</h1>
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Страница не найдена
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                К сожалению, запрашиваемая страница не существует или была перемещена.
                Воспользуйтесь навигацией ниже для перехода к нужному разделу.
              </p>
            </div>

            {/* Навигация по основным разделам */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Link to="/">
                <Button 
                  variant="outline" 
                  className="w-full h-16 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  <Home className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-medium">Главная страница</span>
                </Button>
              </Link>

              <Link to="/store">
                <Button 
                  variant="outline" 
                  className="w-full h-16 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  <ShoppingBag className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-medium">Каталог товаров</span>
                </Button>
              </Link>

              <Link to="/about">
                <Button 
                  variant="outline" 
                  className="w-full h-16 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  <Info className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-medium">О компании</span>
                </Button>
              </Link>

              <Link to="/contact">
                <Button 
                  variant="outline" 
                  className="w-full h-16 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  <Phone className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-medium">Контакты</span>
                </Button>
              </Link>
            </div>

            {/* Кнопка "Назад" */}
            <Button 
              onClick={() => window.history.back()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться назад
            </Button>

            {/* Дополнительная информация */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Если проблема повторяется, свяжитесь с нашей службой поддержки
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default NotFound;