
import { useState, useEffect } from 'react';
import SEOHead from "../components/SEOHead";
import WebsiteSchema from "../components/WebsiteSchema";
import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import FeaturedProducts from "../components/FeaturedProducts";
import AffiliateSection from "../components/AffiliateSection";
import BlogSection from "../components/BlogSection";
import Footer from "../components/Footer";
import Cart from "../components/Cart";
import {useAuthStore} from "@/stores";


const Index = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const user = useAuthStore(state => state.user);
  const login = useAuthStore(state => state.setUser);

  useEffect(() => {
    // Проверяем URL параметры для автоматического входа через Telegram
    const urlParams = new URLSearchParams(window.location.search);
    const tgId = urlParams.get('tg_id');
    const tgFirstName = urlParams.get('first_name');
    const tgUsername = urlParams.get('username');


    if (tgId && tgFirstName && !user) {
      // Создаем объект пользователя Telegram
      const telegramUser = {
        id: parseInt(tgId),
        first_name: decodeURIComponent(tgFirstName),
        username: tgUsername ? decodeURIComponent(tgUsername) : null,
        language_code: 'ru',
        referralCode: tgId, // Используем telegram ID как реферальный код
        telegramId: parseInt(tgId)
      };


      // Выполняем авторизацию через API
      fetch('/api/auth/telegram-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramUser)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.token) {
          login(data.user);
        } else {
        }
      })
      .catch(error => {
      });
      // Очищаем URL от параметров после авторизации
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (!tgId || !tgFirstName) {
    }
  }, [login, user]);

  return (
    <div className="min-h-screen bg-white" itemScope itemType="https://schema.org/Organization">
      <SEOHead 
        title="VitaWin — Премиальные витамины, БАД и пищевые добавки | MLM компания"
        description="VitaWin — ведущая MLM компания в сфере здоровья. Премиальные витамины, БАД и пищевые добавки. Научный подход, ИИ технологии. Партнерская программа до 20%."
        keywords="vitawin, витамины, БАД, пищевые добавки, млм компания, партнерская программа, здоровье, биодобавки"
        ogTitle="VitaWin — Премиальные витамины и БАД | MLM компания"
        ogDescription="Присоединяйтесь к VitaWin — инновационной MLM компании в сфере здоровья. Качественные витамины и БАД с научным подходом."
        ogUrl={`${window.location.origin}`}
        ogImage={`${window.location.origin}/vitawin-logo.png`}
        twitterTitle="VitaWin — Премиальные витамины и БАД"
        twitterDescription="Ведущая MLM компания в сфере здоровья. Научный подход, качественные БАД."
      />
      <WebsiteSchema />
      
      {/* Organization Schema.org microdata */}
      <meta itemProp="name" content="VitaWin" />
      <meta itemProp="url" content="https://vitawins.ru" />
      <meta itemProp="logo" content="https://vitawins.ru/logo.png" />
      <meta itemProp="description" content="Премиальные витамины, БАД и пищевые добавки с научным подходом" />
      <meta itemProp="telephone" content="+7-800-123-45-67" />
      <meta itemProp="email" content="info@vitawins.ru" />
      
      <Header onCartClick={() => setIsCartOpen(true)} />
      <HeroSection />
      <FeaturedProducts />
      <AffiliateSection />
      <BlogSection />
      <Footer />
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default Index;
