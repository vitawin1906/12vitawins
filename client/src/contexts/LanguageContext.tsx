
import {createContext, useContext, useState, ReactNode, useEffect} from 'react';

// Define all supported languages
export type Language = 'en' | 'ru';

// Define the structure of our translations
interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

// Translation data for both languages
export const translations: Translations = {
  en: {
    // Header
    home: "Home",
    products: "Products",
    aboutUs: "About Us",
    contact: "Contact",
    login: "Login",
    myAccount: "My Account",
    
    // Product categories
    vitaminsAndMinerals: "Vitamins & Minerals",
    omega3: "Omega-3 & Fish Oils",
    proteinSupplements: "Protein Supplements",
    herbalSupplements: "Herbal Supplements",
    
    // Homepage sections
    trustedPartner: "Your trusted partner for premium dietary supplements",
    qualityProducts: "Discover our wide range of scientifically-backed supplements",
    featuredProducts: "Featured Products",
    featuredProductsDesc: "Discover our most popular supplements, carefully selected for quality and effectiveness. Get bonuses with every purchase!",
    
    // Account page
    accountStatus: "Account Status",
    statusLevel: "Status Level",
    nextLevel: "Next Level",
    bonusCoins: "Bonus Coins",
    referralRewards: "Referral Rewards",
    totalEarnings: "Total earnings from",
    referrals: "referrals",
    viewDetails: "View referral details",
    shopNow: "Shop now and use your coins",
    
    // Quick access
    quickAccess: "Quick Access",
    paymentMethods: "Payment Methods",
    manageCards: "Manage your cards",
    addresses: "Addresses",
    deliveryLocations: "Your delivery locations",
    referralProgram: "Referrals",
    inviteFriends: "Invite friends & earn",
    rewards: "Rewards",
    viewBenefits: "View your benefits",
    
    // Product details
    addToCart: "Add to cart",
    buyNow: "Buy now",
    productDetails: "Product Details",
    nutritionalInfo: "Nutritional Information",
    howToUse: "How to Use",
    customerReviews: "Customer Reviews",
    verifiedReviews: "verified reviews",
    writeReview: "Write a Review",
    loadMoreReviews: "Load More Reviews",
    verifiedPurchase: "Verified Purchase",
    bonusCoinsEarn: "bonus coins",
    cashback: "cashback",
    qualityGuarantee: "Quality guarantee",
    freeShipping: "Free shipping on orders over",
    sku: "SKU",
    category: "Category",
    
    // Company info
    ourQualityCommitment: "Our Quality Commitment",
    theHighestStandards: "The Highest Standards",
    qualityDescription1: "At NutriVital, we're committed to providing the highest quality dietary supplements available. Our products are manufactured in FDA-registered facilities that follow strict Good Manufacturing Practice (GMP) guidelines.",
    qualityDescription2: "Every batch of our supplements undergoes rigorous testing for purity, potency, and quality. We source our ingredients from trusted suppliers who share our commitment to quality and sustainability.",
    gmpCertified: "GMP Certified",
    fdaRegistered: "FDA Registered",
    thirdPartyTested: "Third-Party Tested",
    sustainablySourced: "Sustainably Sourced",
    ourPromise: "Our Promise",
    promiseDescription: "We stand behind our products with a 100% satisfaction guarantee. If you're not completely satisfied with your purchase, we'll refund your money or replace the product.",
    learnMoreAboutCompany: "Learn More About Our Company",
    
    // Affiliate bonus
    earnWithReferrals: "Earn With Referrals",
    yourPurchase: "Your Purchase",
    purchaseBonus: "back in bonus coins on your purchase",
    firstLevelReferral: "1st Level Referral",
    firstLevelCommission: "commission on direct referrals",
    secondLevelReferral: "2nd Level Referral",
    secondLevelCommission: "commission on 2nd level referrals",
    thirdLevelReferral: "3rd Level Referral",
    thirdLevelCommission: "commission on 3rd level referrals",
    joinAffiliateProgram: "Join Our Affiliate Program",
    
    // Breadcrumbs
    home_breadcrumb: "Home",
    products_breadcrumb: "Products",
  },
  ru: {
    // Header
    home: "Главная",
    products: "Товары",
    aboutUs: "О нас",
    contact: "Контакты",
    login: "Войти",
    myAccount: "Мой аккаунт",
    
    // Product categories
    vitaminsAndMinerals: "Витамины и минералы",
    omega3: "Омега-3 и рыбий жир",
    proteinSupplements: "Протеиновые добавки",
    herbalSupplements: "Травяные добавки",
    
    // Homepage sections
    trustedPartner: "Ваш надёжный партнёр в области премиальных биологически активных добавок",
    qualityProducts: "Откройте широкий ассортимент научно обоснованных добавок",
    featuredProducts: "Рекомендуемые товары",
    featuredProductsDesc: "Откройте наши самые популярные добавки, тщательно отобранные по качеству и эффективности. С каждой покупки вы получаете бонусы!",
    
    // Account page
    accountStatus: "Статус аккаунта",
    statusLevel: "Уровень статуса",
    nextLevel: "Следующий уровень",
    bonusCoins: "Бонусные монеты",
    referralRewards: "Реферальные награды",
    totalEarnings: "Общий заработок от",
    referrals: "рефералов",
    viewDetails: "Просмотреть детали рефералов",
    shopNow: "Купить сейчас и использовать монеты",
    
    // Quick access
    quickAccess: "Быстрый доступ",
    paymentMethods: "Способы оплаты",
    manageCards: "Управление картами",
    addresses: "Адреса",
    deliveryLocations: "Адреса доставки",
    referralProgram: "Реферальная программа",
    inviteFriends: "Пригласить друзей и заработать",
    rewards: "Награды",
    viewBenefits: "Просмотреть преимущества",
    
    // Product details
    addToCart: "В корзину",
    buyNow: "Купить сейчас",
    productDetails: "Описание товара",
    nutritionalInfo: "Состав и пищевая ценность",
    howToUse: "Способ применения",
    customerReviews: "Отзывы покупателей",
    verifiedReviews: "проверенных отзывов",
    writeReview: "Написать отзыв",
    loadMoreReviews: "Загрузить ещё отзывы",
    verifiedPurchase: "Подтверждённая покупка",
    bonusCoinsEarn: "бонусных монет",
    cashback: "кэшбек",
    qualityGuarantee: "Гарантия качества",
    freeShipping: "Бесплатная доставка при заказе от",
    sku: "Артикул",
    category: "Категория",
    
    // Company info
    ourQualityCommitment: "Наши обязательства по качеству",
    theHighestStandards: "Высочайшие стандарты",
    qualityDescription1: "В VitaWin мы стремимся предоставлять биологически активные добавки высочайшего качества. Наша продукция производится на предприятиях, зарегистрированных FDA, которые следуют строгим рекомендациям надлежащей производственной практики (GMP).",
    qualityDescription2: "Каждая партия наших добавок проходит строгое тестирование на чистоту, эффективность и качество. Мы закупаем ингредиенты у проверенных поставщиков, которые разделяют наши обязательства по качеству и устойчивости.",
    gmpCertified: "Сертифицировано GMP",
    fdaRegistered: "Зарегистрировано FDA",
    thirdPartyTested: "Протестировано третьей стороной",
    sustainablySourced: "Экологически чистые источники",
    ourPromise: "Наше обещание",
    promiseDescription: "Мы поддерживаем нашу продукцию 100% гарантией удовлетворения. Если вы не полностью удовлетворены покупкой, мы вернем деньги или заменим товар.",
    learnMoreAboutCompany: "Узнать больше о нашей компании",
    
    // Affiliate bonus
    earnWithReferrals: "Зарабатывайте с рефералами",
    yourPurchase: "Ваша покупка",
    purchaseBonus: "возврат бонусными монетами с покупки",
    firstLevelReferral: "Реферал 1-го уровня",
    firstLevelCommission: "комиссия с прямых рефералов",
    secondLevelReferral: "Реферал 2-го уровня",
    secondLevelCommission: "комиссия с рефералов 2-го уровня",
    thirdLevelReferral: "Реферал 3-го уровня",
    thirdLevelCommission: "комиссия с рефералов 3-го уровня",
    joinAffiliateProgram: "Присоединиться к партнерской программе",
    
    // Breadcrumbs
    home_breadcrumb: "Главная",
    products_breadcrumb: "Товары",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Set Russian as default language
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || 'ru';
  });

  // Function to get translated text
  const t = (key: string): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    // Fallback to Russian instead of English
    if (translations.ru && translations.ru[key]) {
      return translations.ru[key];
    }
    // If key doesn't exist, return the key itself
    return key;
  };

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
