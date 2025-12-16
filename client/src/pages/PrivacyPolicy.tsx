import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Edit3, Save, X, Lock } from 'lucide-react';

const PrivacyPolicy = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [content, setContent] = useState({
    title: 'Политика конфиденциальности',
    lastUpdated: '15 декабря 2024',
    fullText: `1. Общие положения
Настоящая Политика конфиденциальности (далее — «Политика») регулирует порядок обработки и защиты персональных данных, предоставляемых пользователями сайта https://vitawins.ru (далее — «Сайт»), при оформлении заказов и использовании функционала Сайта.

2. Оператор персональных данных
Обработка персональных данных осуществляется Обществом с ограниченной ответственностью «Хёрбалсон» (ИНН: 2100016720, ОГРН: 1242100003760), далее — «Оператор».

3. Персональные данные, подлежащие обработке

ФИО;

Адрес электронной почты;

Номер телефона;

Адрес доставки;

IP-адрес;

Информация о действиях на сайте (cookies, данные аналитики).

4. Цели обработки персональных данных

Регистрация и идентификация пользователя;

Оформление и доставка заказов;

Отправка уведомлений и писем по заказам;

Проведение рекламных и маркетинговых рассылок (при отдельном согласии);

Улучшение работы Сайта с помощью аналитических инструментов (Яндекс.Метрика, Google Analytics).

5. Правовые основания обработки

Договор купли-продажи;

Согласие субъекта персональных данных;

Законодательство РФ (включая 152-ФЗ «О персональных данных»).

6. Использование cookie и аналитики
На Сайте используются cookie-файлы и аналитические сервисы:

Яндекс.Метрика (https://metrica.yandex.ru);

Google Analytics (https://analytics.google.com).

Цель: анализ пользовательского поведения и улучшение пользовательского опыта.

7. Условия передачи данных третьим лицам

Курьерские и почтовые службы для доставки заказов;

Хостинг-провайдеры и IT-подрядчики, обеспечивающие функционирование Сайта;

Уполномоченные государственные органы по запросу.

8. Хранение персональных данных
Срок хранения — не более 5 лет с момента последнего взаимодействия пользователя с Сайтом, если иное не требуется законодательством.

9. Защита персональных данных
Оператор принимает все необходимые правовые, организационные и технические меры для защиты персональных данных.

10. Права пользователя
Пользователь имеет право:

Отозвать согласие на обработку данных;

Требовать уточнения, блокировки или уничтожения данных;

Получить информацию о своих персональных данных и их обработке.

11. Контакты
ООО «Хёрбалсон»
Email: info..vitawins.ru

12. Изменения политики
Оператор вправе вносить изменения в настоящую Политику. Актуальная версия всегда доступна на Сайте.`
  });
  const [tempContent, setTempContent] = useState(content);

  // Проверка авторизации при загрузке
  useEffect(() => {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (telegramId === '131632979') {
      setIsAuthorized(true);
    }
  }, []);

  const handleEdit = () => {
    setTempContent(content);
    setIsEditing(true);
  };

  const handleSave = () => {
    setContent(tempContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempContent(content);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onCartClick={() => setIsCartOpen(true)}
      />
      
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Заголовок с кнопкой редактирования */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditing ? (
                    <Input
                      value={tempContent.title}
                      onChange={(e) => setTempContent(prev => ({ ...prev, title: e.target.value }))}
                      className="text-3xl font-bold border-none shadow-none p-0 h-auto"
                    />
                  ) : (
                    content.title
                  )}
                </h1>
                <p className="text-gray-500 mt-2">
                  Последнее обновление: {isEditing ? (
                    <Input
                      value={tempContent.lastUpdated}
                      onChange={(e) => setTempContent(prev => ({ ...prev, lastUpdated: e.target.value }))}
                      className="inline-block w-auto border-none shadow-none p-0 h-auto text-gray-500"
                    />
                  ) : (
                    content.lastUpdated
                  )}
                </p>
              </div>
              
              {/* Кнопки управления для авторизованного пользователя */}
              {isAuthorized && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Сохранить
                      </Button>
                      <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Отменить
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleEdit} className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Редактировать
                    </Button>
                  )}
                </div>
              )}
              
              {/* Индикатор ограниченного доступа для неавторизованных */}
              {!isAuthorized && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Редактирование ограничено</span>
                </div>
              )}
            </div>

            {/* Основной контент */}
            <div className="prose prose-lg max-w-none">
              {isEditing ? (
                <Textarea
                  value={tempContent.fullText}
                  onChange={(e) => setTempContent(prev => ({ ...prev, fullText: e.target.value }))}
                  className="min-h-[800px] font-mono text-sm"
                  placeholder="Введите текст политики конфиденциальности..."
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                  {content.fullText}
                </pre>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      <Cart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </div>
  );
};

export default PrivacyPolicy;