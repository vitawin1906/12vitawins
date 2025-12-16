import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DetailedDescriptionProps {
  productName: string;
  longDescription?: string;
}

const DetailedDescription = ({ productName, longDescription }: DetailedDescriptionProps) => {
  // Генерируем структурированные данные для SEO
  const generateStructuredData = () => {
    const currentDate = new Date().toISOString();
    
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": `${productName}: польза и применение`,
      "author": {
        "@type": "Organization",
        "name": "VitaWin",
        "url": "https://vitawins.ru"
      },
      "publisher": {
        "@type": "Organization",
        "name": "VitaWin",
        "logo": {
          "@type": "ImageObject",
          "url": "https://vitawins.ru/logo.png"
        }
      },
      "datePublished": currentDate,
      "dateModified": currentDate,
      "description": `Подробная информация о продукте ${productName}: польза, применение, состав и рекомендации по использованию.`,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": window.location.href
      },
      "articleSection": "Здоровье и добавки",
      "keywords": [productName, "здоровье", "добавки", "витамины", "польза", "применение"]
    };
  };

  // Если есть полное описание из админки, используем его
  if (longDescription && longDescription.trim()) {
    const structuredData = generateStructuredData();
    
    return (
      <>
        {/* Микроразметка для SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
        
        <article 
          className="bg-white py-12"
          itemScope
          itemType="https://schema.org/Article"
        >
          <div className="max-w-7xl mx-auto px-4">
            <header>
              <h2 
                className="text-2xl font-bold text-gray-900 mb-8"
                itemProp="headline"
              >
                {productName}: польза и применение
              </h2>
              
              {/* Скрытые метаданные для SEO */}
              <div style={{ display: 'none' }}>
                <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                  <span itemProp="name">VitaWin</span>
                  <span itemProp="url">https://vitawins.ru</span>
                </span>
                <time itemProp="datePublished" dateTime={new Date().toISOString()}>
                  {new Date().toLocaleDateString('ru-RU')}
                </time>
                <span itemProp="publisher" itemScope itemType="https://schema.org/Organization">
                  <span itemProp="name">VitaWin</span>
                </span>
              </div>
            </header>
            
            <div 
              className="prose prose-gray max-w-none"
              itemProp="articleBody"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-gray-800 mt-5 mb-2">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-semibold text-gray-700 mt-4 mb-2">
                      {children}
                    </h4>
                  ),
                  h5: ({ children }) => (
                    <h5 className="text-sm font-semibold text-gray-700 mt-3 mb-1">
                      {children}
                    </h5>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-gray-700 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 pl-6 space-y-2 list-disc">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 pl-6 space-y-2 list-decimal">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-800">
                      {children}
                    </em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 mb-4 bg-gray-50 italic">
                      {children}
                    </blockquote>
                  )
                }}
              >
                {longDescription}
              </ReactMarkdown>
            </div>
          </div>
        </article>
      </>
    );
  }

  // Если полного описания нет, показываем заглушку
  return (
    <div className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">{productName}: польза и применение</h2>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed mb-6">
            Детальное описание товара будет добавлено в ближайшее время. 
            Пожалуйста, обратитесь к краткому описанию выше или свяжитесь с нами для получения дополнительной информации.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DetailedDescription;