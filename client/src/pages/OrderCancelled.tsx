import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  XCircle, 
  ShoppingBag, 
  MessageCircle, 
  ArrowLeft 
} from 'lucide-react';

function OrderCancelled() {
  return (
    <div className="min-h-screen flex flex-col">
        <Header onCartClick={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          
          {/* Cancelled Header */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Заказ отменен
            </h1>
            <p className="text-gray-600">
              Ваш заказ был отменен. Средства будут возвращены в течение 3-5 рабочих дней.
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  Если заказ был отменен по ошибке или у вас есть вопросы, 
                  свяжитесь с нашей службой поддержки.
                </p>
                <p>
                  Мы всегда готовы помочь и найти подходящее решение!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/store">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Продолжить покупки
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/contact">
                <MessageCircle className="w-4 h-4 mr-2" />
                Связаться с поддержкой
              </Link>
            </Button>
            
            <Button variant="ghost" asChild className="w-full">
              <Link to="/account">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Мой профиль
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default OrderCancelled;