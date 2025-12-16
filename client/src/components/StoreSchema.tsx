import { useEffect } from 'react';

type Maybe<T> = T | null | undefined;

interface ProductForSchema {
    id: string;                               // UUID либо строковый id
    name?: string;
    price?: number | string;                  // рубли
    priceCents?: number;                      // копейки (если есть)
    category?: Maybe<string | { name?: string; slug?: string }>;
    images?: any[];                           // string[] | object[]
    slug?: string;
}

interface StoreSchemaProps {
    products?: ProductForSchema[];
}

function pickImageUrl(img: any): string | undefined {
    // img может быть строкой
    if (typeof img === 'string') {
        // абсолютный или относительный путь
        return /^https?:\/\//i.test(img) ? img : `https://vitawins.ru${img}`;
    }
    // или объект
    if (img && typeof img === 'object') {
        const url =
            img.url ??
            img.secure_url ??
            img.src ??
            img.path ??
            img.media?.secure_url ??
            img.media?.url ??
            (typeof img.mediaId === 'string' && /^https?:\/\//i.test(img.mediaId) ? img.mediaId : undefined);

        if (typeof url === 'string') {
            return /^https?:\/\//i.test(url) ? url : `https://vitawins.ru${url}`;
        }
    }
    return undefined;
}

function getMainImageUrlForSchema(p: ProductForSchema): string {
    const imgs = Array.isArray(p?.images) ? p.images : [];
    // ищем main/primary/sortOrder=0
    const sorted = [...imgs].sort((a: any, b: any) => Number(a?.sortOrder ?? 9999) - Number(b?.sortOrder ?? 9999));
    const candidate =
        imgs.find((x: any) => {
            const role = String(x?.role ?? '').toLowerCase();
            return role === 'main' || role === 'primary' || x?.isMain === true || x?.sortOrder === 0;
        }) ?? sorted[0];

    const fromCandidate = candidate ? pickImageUrl(candidate) : undefined;
    if (fromCandidate) return fromCandidate;

    // fallback: просто возьмём первый валидный url из массива
    for (const it of imgs) {
        const u = pickImageUrl(it);
        if (u) return u;
    }

    return 'https://vitawins.ru/logo.png';
}

function getCategoryName(cat: ProductForSchema['category']): string | undefined {
    if (!cat) return undefined;
    if (typeof cat === 'string') return cat;
    return cat.name || cat.slug;
}

function getPriceRub(product: ProductForSchema): number {
    if (typeof product.priceCents === 'number') return product.priceCents / 100;
    const num = Number(product.price);
    return Number.isFinite(num) ? num : 0;
}

const StoreSchema = ({ products = [] }: StoreSchemaProps) => {
    useEffect(() => {
        try {
            // Удаляем старый script, если был
            document
                .querySelectorAll('script[type="application/ld+json"][data-schema="store"]')
                .forEach((el) => el.remove());

            const storeSchema: any = {
                '@context': 'https://schema.org',
                '@type': 'Store',
                name: 'VitaWin - Магазин витаминов и добавок',
                description: 'Интернет-магазин качественных пищевых добавок и витаминов с доставкой по России',
                url: 'https://vitawins.ru/store',
                image: 'https://vitawins.ru/logo.png',
                telephone: '+7-800-555-0199',
                address: {
                    '@type': 'PostalAddress',
                    addressCountry: 'RU',
                    addressLocality: 'Россия',
                },
                openingHours: 'Mo-Su 00:00-23:59',
                currenciesAccepted: 'RUB',
                paymentAccepted: 'Cash, Credit Card, Bank Transfer',
                priceRange: '₽₽',
            };

            if (Array.isArray(products) && products.length > 0) {
                storeSchema.hasOfferCatalog = {
                    '@type': 'OfferCatalog',
                    name: 'Каталог товаров VitaWin',
                    itemListElement: products.slice(0, 10).map((product, index) => {
                        const imageUrl = getMainImageUrlForSchema(product);
                        const categoryName = getCategoryName(product.category);
                        const priceRub = getPriceRub(product);

                        return {
                            '@type': 'Offer',
                            position: index + 1,
                            itemOffered: {
                                '@type': 'Product',
                                name: product.name ?? `Товар ${product.id}`,
                                ...(categoryName ? { category: categoryName } : {}),
                                image: imageUrl,
                                url: `https://vitawins.ru/product/${product.slug || product.id}`,
                            },
                            price: priceRub.toFixed(2),
                            priceCurrency: 'RUB',
                            availability: 'https://schema.org/InStock',
                            seller: {
                                '@type': 'Organization',
                                name: 'VitaWin',
                            },
                        };
                    }),
                };
            }

            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-schema', 'store');
            script.textContent = JSON.stringify(storeSchema);
            document.head.appendChild(script);
        } catch (e) {
            // Не ломаем страницу, если что-то пойдёт не так
            console.error('StoreSchema: failed to inject JSON-LD', e);
        }

        return () => {
            document
                .querySelectorAll('script[type="application/ld+json"][data-schema="store"]')
                .forEach((el) => el.remove());
        };
    }, [products]);

    return null;
};

export default StoreSchema;
