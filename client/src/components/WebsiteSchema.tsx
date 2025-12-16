import { useEffect } from 'react';

const WebsiteSchema = () => {
  useEffect(() => {
    // Удаляем существующую разметку организации
    const existingScript = document.querySelector('script[type="application/ld+json"][data-schema="organization"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Создаем Schema.org разметку для организации
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "VitaWin",
      "url": "https://vitawins.ru",
      "logo": "https://vitawins.ru/logo.png",
      "description": "Интернет-магазин качественных пищевых добавок и витаминов с быстрой доставкой по России",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": "Russian"
      },
      "sameAs": [
        "https://t.me/Vitawin_bot"
      ]
    };

    // Создаем Schema.org разметку для сайта
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "VitaWin - Магазин витаминов и пищевых добавок",
      "url": "https://vitawins.ru",
      "description": "Качественные витамины и пищевые добавки с доставкой по России. Реферальная программа и бонусы за покупки.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://vitawins.ru/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      },
      "publisher": {
        "@type": "Organization",
        "name": "VitaWin",
        "url": "https://vitawins.ru"
      }
    };

    // Объединяем схемы в массив
    const combinedSchema = [organizationSchema, websiteSchema];

    // Создаем и добавляем script элемент
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'organization');
    script.textContent = JSON.stringify(combinedSchema, null, 2);
    document.head.appendChild(script);

    // Очистка при размонтировании
    return () => {
      const schemaScript = document.querySelector('script[type="application/ld+json"][data-schema="organization"]');
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, []);

  return null;
};

export default WebsiteSchema;