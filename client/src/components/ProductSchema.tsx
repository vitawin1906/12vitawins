import { useEffect } from 'react';

interface ProductSchemaProps {
  product: {
    id: string;
    name: string;
    description: string | undefined;
    price: string;
    original_price?: string;
    category: string;
    images: string[];
    sku?: string;
    manufacturer?: string;
    benefits?: string[];
    slug?: string;
    stock?: number;
  };
  rating?: number;
  reviewCount?: number;
}

const ProductSchema = ({ product, rating = 4.8, reviewCount = 247 }: ProductSchemaProps) => {
  useEffect(() => {
    // Удаляем существующую Schema.org разметку для товара
    const existingScript = document.querySelector('script[type="application/ld+json"][data-schema="product"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Создаем структурированные данные для товара
    const productSchema: any = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.images.map(img => 
        img.startsWith('http') ? img : `https://vitawins.ru${img}`
      ),
      "sku": product.sku || `VW-${product.id}`,
      "brand": {
        "@type": "Brand",
        "name": product.manufacturer || "VitaWin"
      },
      "category": product.category,
      "offers": {
        "@type": "Offer",
        "url": `https://vitawins.ru/product/${product.slug || product.id}`,
        "priceCurrency": "RUB",
        "price": (parseFloat(product.price) / 100).toFixed(2),
        "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "VitaWin",
          "url": "https://vitawins.ru"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": rating.toString(),
        "reviewCount": reviewCount.toString(),
        "bestRating": "5",
        "worstRating": "1"
      }
    };

    // Добавляем дополнительные свойства если есть
    if (product.benefits && product.benefits.length > 0) {
      productSchema.additionalProperty = product.benefits.map(benefit => ({
        "@type": "PropertyValue",
        "name": "Преимущество",
        "value": benefit
      }));
    }

    // Создаем и добавляем script элемент
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'product');
    script.textContent = JSON.stringify(productSchema, null, 2);
    document.head.appendChild(script);

    // Очистка при размонтировании компонента
    return () => {
      const schemaScript = document.querySelector('script[type="application/ld+json"][data-schema="product"]');
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, [product, rating, reviewCount]);

  return null; // Компонент не рендерит видимого контента
};

export default ProductSchema;