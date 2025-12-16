import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Edit3, Save, X, Lock } from 'lucide-react';

const CookiePolicy = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [content, setContent] = useState({
    title: 'Политика cookies',
    lastUpdated: '05 июня 2025 г.',
    fullText: `ПОЛИТИКА В ОТНОШЕНИИ ОБРАБОТКИ COOKIES

ООО «Хёрбалсон»
ОГРН: 1242100003760
ИНН: 2100016720
Адрес: 347900, Ростовская область, г. Таганрог, пер. Коммунистический, д. 4А, оф. 1
Сайт: https://vitawins.ru
Email: privacy..vitawins.ru

Дата последнего обновления: 05 июня 2025 г.

1. ОБЩИЕ ПОЛОЖЕНИЯ

1.1. Настоящая Политика в отношении обработки cookies (далее – Политика) определяет порядок использования файлов cookies и аналогичных технологий на веб-сайте https://vitawins.ru (далее – Сайт).

1.2. Оператором Сайта является ООО «Хёрбалсон» (далее – Оператор, мы).

1.3. Использование Сайта означает согласие пользователя с настоящей Политикой и условиями обработки cookies.

2. ЧТО ТАКОЕ COOKIES

2.1. Cookies (куки) – это небольшие текстовые файлы, которые веб-сайт сохраняет на вашем устройстве (компьютере, планшете, смартфоне) при его посещении.

2.2. Cookies содержат информацию, которая может быть прочитана веб-сервером домена, разместившего cookie на вашем устройстве.

2.3. Cookies позволяют сайту распознать ваше устройство при последующих посещениях и обеспечить более удобную работу с Сайтом.

3. ЦЕЛИ ИСПОЛЬЗОВАНИЯ COOKIES

Мы используем cookies для следующих целей:

3.1. Обеспечение функционирования Сайта:
- Поддержание пользовательских сессий
- Обеспечение безопасности
- Сохранение языковых предпочтений
- Функционирование корзины покупок

3.2. Аналитика и улучшение Сайта:
- Анализ посещаемости и поведения пользователей
- Оптимизация производительности Сайта
- Тестирование новых функций

3.3. Персонализация:
- Запоминание ваших предпочтений
- Персонализация контента
- Улучшение пользовательского опыта

3.4. Маркетинг и реклама:
- Показ релевантной рекламы
- Ретаргетинг
- Измерение эффективности рекламных кампаний

4. ТИПЫ ИСПОЛЬЗУЕМЫХ COOKIES

4.1. По сроку действия:
- Сессионные cookies – удаляются при закрытии браузера
- Постоянные cookies – хранятся в течение определенного времени

4.2. По происхождению:
- Собственные cookies – устанавливаются нашим Сайтом
- Сторонние cookies – устанавливаются третьими лицами

4.3. По назначению:
- Строго необходимые cookies
- Функциональные cookies
- Аналитические cookies
- Рекламные cookies

5. ДЕТАЛЬНОЕ ОПИСАНИЕ COOKIES

5.1. Строго необходимые cookies:
Название: session_id
Цель: Идентификация пользовательской сессии
Срок хранения: До закрытия браузера

Название: csrf_token
Цель: Защита от CSRF-атак
Срок хранения: 24 часа

Название: cart_data
Цель: Сохранение содержимого корзины
Срок хранения: 30 дней

5.2. Аналитические cookies:
Название: _ym_uid, _ym_d (Яндекс.Метрика)
Цель: Анализ посещаемости сайта
Срок хранения: 2 года

5.3. Рекламные cookies:
Название: _fbp (Facebook Pixel)
Цель: Ретаргетинг и аналитика рекламы
Срок хранения: 90 дней

6. СТОРОННИЕ СЕРВИСЫ

На нашем Сайте используются следующие сторонние сервисы, которые могут устанавливать свои cookies:

6.1. Яндекс.Метрика – для веб-аналитики
6.2. Facebook Pixel – для рекламной аналитики
6.3. ЮKassa – для обработки платежей
6.4. Telegram Widget – для интеграции с Telegram

Каждый из этих сервисов имеет собственную политику конфиденциальности и cookies.

7. УПРАВЛЕНИЕ COOKIES

7.1. Вы можете управлять cookies через настройки вашего браузера:

Google Chrome:
Настройки → Конфиденциальность и безопасность → Файлы cookie и другие данные сайтов

Mozilla Firefox:
Настройки → Приватность и защита → Куки и данные сайтов

Safari:
Настройки → Конфиденциальность → Управление данными веб-сайтов

Microsoft Edge:
Настройки → Файлы cookie и разрешения сайтов

7.2. Вы можете:
- Блокировать все cookies
- Блокировать сторонние cookies
- Удалить существующие cookies
- Настроить уведомления о cookies

7.3. Обратите внимание, что отключение cookies может повлиять на функциональность Сайта.

8. СОГЛАСИЕ НА ИСПОЛЬЗОВАНИЕ COOKIES

8.1. При первом посещении Сайта вы увидите уведомление о использовании cookies.

8.2. Продолжение использования Сайта означает ваше согласие на использование cookies в соответствии с настоящей Политикой.

8.3. Вы можете отозвать свое согласие в любое время, изменив настройки браузера.

9. БЕЗОПАСНОСТЬ

9.1. Мы принимаем все необходимые меры для защиты информации, получаемой через cookies.

9.2. Доступ к информации из cookies ограничен и предоставляется только уполномоченным лицам.

9.3. Мы не передаем информацию из cookies третьим лицам, за исключением случаев, предусмотренных законодательством.

10. ИЗМЕНЕНИЯ В ПОЛИТИКЕ

10.1. Мы оставляем за собой право вносить изменения в настоящую Политику.

10.2. О существенных изменениях мы уведомим пользователей путем размещения уведомления на Сайте.

10.3. Рекомендуем регулярно просматривать настоящую Политику для получения актуальной информации.

11. КОНТАКТНАЯ ИНФОРМАЦИЯ

По всем вопросам, связанным с настоящей Политикой и использованием cookies, вы можете обращаться к нам:

Email: privacy..vitawins.ru
Телефон: +7 (800) 123-45-67
Адрес: 347900, Ростовская область, г. Таганрог, пер. Коммунистический, д. 4А, оф. 1

Время работы службы поддержки: пн-пт с 9:00 до 18:00 (МСК)

12. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ

12.1. Настоящая Политика составлена в соответствии с требованиями российского законодательства.

12.2. Все споры, возникающие в связи с применением настоящей Политики, подлежат разрешению в соответствии с действующим законодательством Российской Федерации.

12.3. Если какое-либо положение настоящей Политики будет признано недействительным, остальные положения сохраняют свою силу.`
  });

  useEffect(() => {
    const userTelegramId = localStorage.getItem('telegramUserId');
    setIsAuthorized(userTelegramId === '131632979');
  }, []);

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onCartClick={() => setIsCartOpen(true)} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          {isEditing ? (
            <Input
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              className="text-3xl font-bold border-none p-0 focus:ring-0"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900">{content.title}</h1>
          )}
          
          {isAuthorized && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Отмена
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Редактировать
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mb-6">
          {isEditing && isAuthorized ? (
            <Input
              value={content.lastUpdated}
              onChange={(e) => setContent({ ...content, lastUpdated: e.target.value })}
              className="text-sm text-gray-600 border-none p-0 focus:ring-0"
            />
          ) : (
            <p className="text-sm text-gray-600">Последнее обновление: {content.lastUpdated}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {isEditing && isAuthorized ? (
            <Textarea
              value={content.fullText}
              onChange={(e) => setContent({ ...content, fullText: e.target.value })}
              rows={25}
              className="w-full resize-none text-gray-700 leading-relaxed"
              placeholder="Введите полный текст политики cookies..."
            />
          ) : (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans bg-[#ffffff]">
                {content.fullText}
              </pre>
            </div>
          )}
        </div>

        
      </div>
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default CookiePolicy;