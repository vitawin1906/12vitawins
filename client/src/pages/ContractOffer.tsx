import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Edit3, Save, X, Lock } from 'lucide-react';

const ContractOffer = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [content, setContent] = useState({
    title: 'Договор публичной оферты',
    lastUpdated: '7 июня 2025',
    fullText: `Настоящий документ является официальным предложением (офертой) ООО «Хёрбалсон» (ИНН: 2100016720, ОГРН: 1242100003760), далее — «Продавец», и содержит все существенные условия договора купли-продажи товаров, размещённых на сайте https://vitawins.ru (далее — «Сайт»).

1. Общие положения
1.1. Настоящая оферта является публичной и действует в отношении всех пользователей Сайта (далее — «Покупатель»).
1.2. Принятием (акцептом) оферты считается оформление Заказа через интерфейс Сайта, с установкой галочки в соответствующем чекбоксе и нажатием кнопки «Оформить заказ».

2. Предмет договора
2.1. Продавец обязуется передать в собственность Покупателя товары, представленные на Сайте, а Покупатель обязуется оплатить и принять заказанный товар.
2.2. Все характеристики товаров, включая их описание, состав и противопоказания, размещаются в карточках товаров на Сайте.

3. Порядок оформления заказа
3.1. Заказ оформляется через Сайт с использованием корзины.
3.2. При оформлении заказа Покупатель предоставляет достоверные данные: ФИО, контактный телефон, адрес доставки, адрес электронной почты.
3.3. Перед подтверждением заказа Покупатель выражает своё согласие с условиями настоящей Оферты, Политикой конфиденциальности и Политикой использования cookie, устанавливая соответствующие галочки.

4. Оплата
4.1. Оплата производится онлайн, через платёжные системы, подключённые к Сайту.
4.2. Все цены указаны в рублях и включают НДС, если иное не указано.
4.3. В случае возврата товара денежные средства возвращаются тем же способом, которым была произведена оплата.

5. Доставка
5.1. Доставка осуществляется курьерскими и почтовыми службами по адресу, указанному Покупателем.
5.2. Сроки доставки зависят от региона и выбранного способа доставки и указываются на Сайте при оформлении заказа.

6. Возврат товара
6.1. Возврат товаров надлежащего качества возможен, если сохранён товарный вид, пломбы и упаковка, в течение 7 дней с момента получения.
6.2. Возврат товаров ненадлежащего качества производится в соответствии с законодательством РФ.
6.3. Возврат не осуществляется в случае, если товар является пищевой продукцией, добавками, и его упаковка была вскрыта.

7. Ограничения и противопоказания
7.1. Информация о противопоказаниях и рекомендации по применению указываются в описании товаров.
7.2. Покупатель обязан ознакомиться с противопоказаниями до оформления заказа.

8. Персональные данные
8.1. Оформляя заказ, Покупатель даёт согласие на обработку персональных данных в соответствии с Политикой конфиденциальности.
8.2. На Сайте используются аналитические инструменты Яндекс.Метрика и Google Analytics для улучшения пользовательского опыта. Установка cookie-файлов регулируется отдельной Политикой использования cookie.

9. Ответственность
9.1. Продавец не несёт ответственности за неправильное использование продукции.
9.2. Продавец не несёт ответственности за убытки, возникшие в результате недостоверности данных, предоставленных Покупателем.

10. Срок действия оферты
10.1. Оферта действует бессрочно, пока размещена на Сайте.
10.2. Продавец оставляет за собой право вносить изменения в оферту в одностороннем порядке. Актуальная версия всегда доступна на Сайте.

11. Контактные данные
ООО «Хёрбалсон»
Email: info..vitawins.ru

12. Реквизиты Продавца
ИНН: 2100016720
ОГРН: 1242100003760

13. Реферальная программа и бонусный счёт
13.1. На Сайте может быть реализована система реферальных вознаграждений. Участником программы может стать любой зарегистрированный пользователь.
13.2. Пригласив новых пользователей и/или совершившие ими покупки, Пользователь может получать бонусные баллы в соответствии с условиями, указанными в личном кабинете.
13.3. Начисленные бонусные баллы могут быть использованы только на оплату части стоимости последующих покупок. Обмен на денежные средства не предусмотрен.
13.4. Условия начисления и использования бонусов, а также возможные ограничения и сроки действия, указываются на Сайте и могут быть изменены Продавцом в одностороннем порядке.
13.5. В случае нарушения условий оферты, правил Сайта или злоупотребления системой, бонусный счёт может быть аннулирован без предварительного уведомления.`
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
    <div className="min-h-screen bg-[#f2f2f2]">
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
                  placeholder="Введите текст договора оферты..."
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed bg-[#ffffff]">
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

export default ContractOffer;