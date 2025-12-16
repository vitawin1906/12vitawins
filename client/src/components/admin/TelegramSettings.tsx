import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { axiosApi } from '@/lib/axiosApi';

interface WebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
}

const TelegramSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [supportWebhookInfo, setSupportWebhookInfo] = useState<WebhookInfo | null>(null);
  const { toast } = useToast();

  const handleSetWebhook = async () => {
    setIsLoading(true);
    try {
      // Сначала проверим токен
      const debugResponse = await axiosApi.get('/telegram/debug');
      const debugResult = debugResponse.data;

      if (!debugResult.main_bot?.token_exists) {
        toast({
          title: "Ошибка",
          description: "Токен основного Telegram бота не установлен в переменных окружения",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await axiosApi.post('/telegram/set-webhook');
      const result = response.data;

      if (result.success) {
        toast({
          title: "Webhook установлен",
          description: "Telegram бот настроен успешно!",
        });
        await getWebhookInfo();
      } else {
        toast({
          title: "Ошибка",
          description: result.error || "Не удалось установить webhook",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Ошибка при установке webhook: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWebhookInfo = async () => {
    setIsLoading(true);
    try {
      const [mainResponse, supportResponse] = await Promise.all([
        axiosApi.get('/telegram/webhook-info'),
        axiosApi.get('/telegram/support/webhook-info')
      ]);

      if (mainResponse.data.ok) {
        setWebhookInfo(mainResponse.data.result);
      }

      if (supportResponse.data.ok) {
        setSupportWebhookInfo(supportResponse.data.result);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Ошибка при получении информации о webhook",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSupportWebhook = async () => {
    setIsLoading(true);
    try {
      const debugResponse = await axiosApi.get('/telegram/debug');
      const debugResult = debugResponse.data;

      if (!debugResult.support_bot?.token_exists) {
        toast({
          title: "Ошибка",
          description: "Токен бота поддержки не установлен в переменных окружения",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await axiosApi.post('/telegram/support/set-webhook');
      const result = response.data;

      if (result.success) {
        toast({
          title: "Webhook установлен",
          description: "Бот поддержки настроен успешно!",
        });
        await getWebhookInfo();
      } else {
        toast({
          title: "Ошибка",
          description: result.error || "Не удалось установить webhook для бота поддержки",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Ошибка при установке webhook: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки Telegram бота
          </CardTitle>
          <CardDescription>
            Настройка интеграции с Telegram ботом для автоматической регистрации пользователей
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleSetWebhook} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Установить Webhook
            </Button>
            <Button 
              variant="outline" 
              onClick={getWebhookInfo} 
              disabled={isLoading}
            >
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Проверить статус
            </Button>
          </div>

          {webhookInfo && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Статус Webhook
                {webhookInfo.url ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Активен
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Не настроен
                  </Badge>
                )}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">URL Webhook:</label>
                  <p className="text-sm text-gray-600 break-all">
                    {webhookInfo.url || 'Не установлен'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Ожидающие обновления:</label>
                  <p className="text-sm text-gray-600">
                    {webhookInfo.pending_update_count || 0}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Максимум соединений:</label>
                  <p className="text-sm text-gray-600">
                    {webhookInfo.max_connections || 'Не указано'}
                  </p>
                </div>
                
                {webhookInfo.last_error_message && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-red-700">Последняя ошибка:</label>
                    <p className="text-sm text-red-600">
                      {webhookInfo.last_error_message}
                    </p>
                    {webhookInfo.last_error_date && (
                      <p className="text-xs text-gray-500">
                        {new Date(webhookInfo.last_error_date * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Как это работает:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Пользователь заходит в Telegram бот @Vitawin_bot</li>
              <li>2. Нажимает команду /start</li>
              <li>3. Автоматически создается аккаунт в системе</li>
              <li>4. Генерируется реферальный код = Telegram ID</li>
              <li>5. Пользователь получает приветственное сообщение с инструкциями</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Бот поддержки @vitawin_support_bot
          </CardTitle>
          <CardDescription>
            Настройка бота поддержки для обработки запросов пользователей
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleSetSupportWebhook} 
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Установить Webhook поддержки
            </Button>
          </div>

          {supportWebhookInfo && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Статус Webhook поддержки
                {supportWebhookInfo.url ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Активен
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Не настроен
                  </Badge>
                )}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">URL Webhook:</label>
                  <p className="text-sm text-gray-600 break-all">
                    {supportWebhookInfo.url || 'Не установлен'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Ожидающие обновления:</label>
                  <p className="text-sm text-gray-600">
                    {supportWebhookInfo.pending_update_count || 0}
                  </p>
                </div>
                
                {supportWebhookInfo.last_error_message && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-red-700">Последняя ошибка:</label>
                    <p className="text-sm text-red-600">
                      {supportWebhookInfo.last_error_message}
                    </p>
                    {supportWebhookInfo.last_error_date && (
                      <p className="text-xs text-gray-500">
                        {new Date(supportWebhookInfo.last_error_date * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">Функции бота поддержки:</h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Автоматические ответы на частые вопросы</li>
              <li>• Подключение к менеджеру поддержки</li>
              <li>• Инструкции по использованию платформы</li>
              <li>• Помощь с реферальной программой</li>
              <li>• Переадресация в основной бот для покупок</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramSettings;