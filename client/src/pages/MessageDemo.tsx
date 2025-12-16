import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useMessages } from "../contexts/MessageContext";

export default function MessageDemo() {
  const { showError, showSuccess, showWarning, showInfo, clearAllMessages } = useMessages();

  const handleErrorDemo = () => {
    showError(
      "Ошибка платежа", 
      "Не удалось обработать платеж. Проверьте данные карты и попробуйте снова."
    );
  };

  const handleSuccessDemo = () => {
    showSuccess(
      "Заказ оформлен",
      "Ваш заказ №12345 успешно создан. Мы отправили подтверждение на ваш email."
    );
  };

  const handleWarningDemo = () => {
    showWarning(
      "Низкий остаток",
      "На складе осталось только 3 единицы этого товара. Рекомендуем оформить заказ как можно скорее."
    );
  };

  const handleInfoDemo = () => {
    showInfo(
      "Новая акция",
      "Скидка 15% на все товары категории 'Витамины' до конца месяца!"
    );
  };

  const handlePersistentError = () => {
    showError(
      "Критическая ошибка",
      "Системная ошибка сервера. Обратитесь в техподдержку.",
      { autoClose: false }
    );
  };

  const handleQuickMessage = () => {
    showSuccess(
      "Быстрое уведомление",
      "Товар добавлен в корзину",
      { duration: 2000 }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Демонстрация системы сообщений
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Тестируйте различные типы анимированных уведомлений
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Основные типы сообщений */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Типы сообщений</CardTitle>
                <CardDescription>
                  Четыре основных типа уведомлений с разной стилизацией
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleErrorDemo}
                  variant="destructive"
                  className="w-full"
                >
                  Показать ошибку
                </Button>
                
                <Button 
                  onClick={handleSuccessDemo}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Показать успех
                </Button>
                
                <Button 
                  onClick={handleWarningDemo}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  Показать предупреждение
                </Button>
                
                <Button 
                  onClick={handleInfoDemo}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Показать информацию
                </Button>
              </CardContent>
            </Card>

            {/* Дополнительные опции */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Специальные настройки</CardTitle>
                <CardDescription>
                  Сообщения с особым поведением и длительностью
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handlePersistentError}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  Постоянное сообщение
                </Button>
                
                <Button 
                  onClick={handleQuickMessage}
                  variant="outline"
                  className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Быстрое сообщение (2 сек)
                </Button>
                
                <Button 
                  onClick={clearAllMessages}
                  variant="secondary"
                  className="w-full"
                >
                  Очистить все сообщения
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Примеры использования */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Примеры использования в коде</CardTitle>
              <CardDescription>
                Как использовать систему сообщений в ваших компонентах
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono">
                <div className="space-y-2">
                  <div className="text-gray-600 dark:text-gray-400">// Импорт хука</div>
                  <div>import {`{ useMessages }`} from '../contexts/MessageContext';</div>
                  
                  <div className="mt-4 text-gray-600 dark:text-gray-400">// Использование в компоненте</div>
                  <div>const {`{ showError, showSuccess }`} = useMessages();</div>
                  
                  <div className="mt-4 text-gray-600 dark:text-gray-400">// Показать ошибку</div>
                  <div>showError('Заголовок', 'Описание ошибки');</div>
                  
                  <div className="mt-4 text-gray-600 dark:text-gray-400">// Показать успех с настройками</div>
                  <div>showSuccess('Успех', 'Операция выполнена', {`{ duration: 3000 }`});</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Возврат в магазин */}
          <div className="text-center mt-8">
            <Button asChild variant="outline">
              <a href="/store">Вернуться в магазин</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}