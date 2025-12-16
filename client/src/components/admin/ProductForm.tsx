// client/src/components/admin/ProductForm.tsx

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ToggleLeft, ToggleRight, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { axiosApi } from '@/lib/axiosApi';
import {
    useCreateProductMutation,
    useUpdateProductMutation,
    type Product,
} from '@/store/api/domains/productsApi';
import { useGetAdminCategoriesQuery } from '@/store/api/domains';
import { ImageUploader } from './ImageUploader';
import { ProductImageMetadata } from '@/types/product';

const BADGES = [
    'Бестселлер',
    'Новинка',
    'Премиум',
    'Популярный',
    'Выгодно',
    'Рекомендовано врачами',
    'Ограниченная серия',
    'Эко-продукт',
];

interface ProductFormNewProps {
    product?: Product | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormNewProps) {
    // Изображения: массив метаданных (mediaId/role/sortOrder/alt)
    const [images, setImages] = useState<ProductImageMetadata[]>([]);
    const [benefits, setBenefits] = useState<string[]>(product?.benefits || []);
    const [currentBenefit, setCurrentBenefit] = useState('');
    const [compositionRows, setCompositionRows] = useState<{ component: string; amount: string }[]>(
        (product as any)?.composition_table && Array.isArray((product as any).composition_table)
            ? (product as any).composition_table
            : [{ component: '', amount: '' }],
    );
    const [isActive, setIsActive] = useState<boolean>(product?.status === 'active' || !product);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>((product as any)?.categoryId || '');
    const [selectedBadge, setSelectedBadge] = useState<string>(product?.badge || '');
    const [isGeneratingArticle, setIsGeneratingArticle] = useState<boolean>(false);

    const [createProduct] = useCreateProductMutation();
    const [updateProduct] = useUpdateProductMutation();
    const { data: categories = [], isLoading: categoriesLoading } = useGetAdminCategoriesQuery();
    const { toast } = useToast();

    // Гарантируем 1 main и последовательный sortOrder
    const ensureRoles = (arr: ProductImageMetadata[]) => {
        const sorted = [...(arr || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        if (sorted.length > 0 && !sorted.some((i) => i.role === 'main')) {
            sorted[0] = { ...sorted[0], role: 'main' };
        }
        return sorted.map((i, idx) => ({ ...i, sortOrder: idx }));
    };

    // Приводим приходящие product.images к метаданным
    useEffect(() => {
        if (product?.images) {
            const imageMetadata: ProductImageMetadata[] = (product.images as any[]).map((img: any, idx: number) => {
                if (typeof img === 'string') {
                    return {
                        mediaId: img,
                        role: idx === 0 ? 'main' : 'gallery',
                        sortOrder: idx,
                    };
                }
                return img;
            });
            setImages(imageMetadata);
        }
    }, [product]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm({
        defaultValues: {
            name: product?.name || '',
            description: product?.description || '',
            long_description: product?.longDescription || '',
            price: product?.price || 0,
            original_price: product?.originalPrice || 0,
            category: (product as any)?.category || '',
            badge: product?.badge || '',
            stock: product?.stock || 0,
            status: (product?.status || 'active') as 'active' | 'inactive',
            sku: product?.sku || '',
            slug: product?.slug || '',
            capsule_count: product?.capsuleCount || 0,
            capsule_volume: product?.capsuleVolume || '',
            servings_per_container: product?.servingsPerContainer || 0,
            manufacturer: product?.manufacturer || '',
            country_of_origin: product?.countryOfOrigin || '',
            expiration_date: product?.expirationDate || '',
            storage_conditions: product?.storageConditions || '',
            how_to_take: (product?.howToTake || 'morning') as
                | 'morning'
                | 'morning_evening'
                | 'with_meals'
                | 'before_meals'
                | 'custom',
            usage: product?.usage || '',
            additional_info: product?.additionalInfo || '',

            // ✅ SEO поля
            seo_title: product?.seoTitle || '',
            seo_description: product?.seoDescription || '',
            seo_keywords: product?.seoKeywords || '',

            // ✅ поля для ручной настройки бонусов (camelCase)
            customPv: product?.customPv?.toString() || '',
            // КРИТИЧНО: product.customCashback приходит как ДОЛЯ (0.05 = 5%), конвертируем в проценты для формы
            customCashback: product?.customCashback != null ? (product.customCashback * 100).toString() : '',
        },
    });

    const generateSlug = (name: string): string =>
        name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

    useEffect(() => {
        if (!product?.id) {
            const name = watch('name');
            if (name) {
                const newSlug = generateSlug(name);
                setValue('slug', newSlug);
            }
        }
    }, [watch('name'), product?.id, setValue]);

    const toggleActiveStatus = async () => {
        if (!product?.id) return;

        const newStatus = (isActive ? 'inactive' : 'active') as 'active' | 'inactive';

        try {
            await updateProduct({
                id: product.id.toString(),
                status: newStatus,
            }).unwrap();

            setIsActive(!isActive);
            (setValue as any)('status', newStatus);

            toast({
                title: isActive ? 'Товар деактивирован' : 'Товар активирован',
                description: `Товар ${isActive ? 'скрыт' : 'отображается'} на сайте`,
            });
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Не удалось изменить статус товара',
                variant: 'destructive',
            });
        }
    };

    const onSubmit = async (data: any) => {
        if (!selectedCategoryId) {
            toast({ title: 'Ошибка', description: 'Выберите категорию товара', variant: 'destructive' });
            return;
        }

        const isCreate = !product?.id;

        if (isCreate && images.length === 0) {
            toast({ title: 'Нужна хотя бы одна картинка', description: 'Загрузите изображение товара', variant: 'destructive' });
            return;
        }

        const productData: any = {
            name: data.name,
            slug: data.slug,
            description: data.description || undefined,
            longDescription: data.long_description || undefined,

            price: parseFloat(data.price) || 0,
            originalPrice: data.original_price ? parseFloat(data.original_price) : undefined,

            categoryId: selectedCategoryId,

            stock: parseInt(data.stock) || 0,
            sku: data.sku || undefined,

            isPvEligible: true,

            // ✅ camelCase -> Product interface (который denormalize конвертирует в API формат)
            customPv: data.customPv !== '' ? parseInt(data.customPv) : undefined,
            // КРИТИЧНО: форма хранит ПРОЦЕНТЫ (5), конвертируем в ДОЛИ (0.05) для Product interface
            // denormalizeProductToApi потом конвертирует обратно в проценты для бэкенда
            customCashback: data.customCashback !== '' ? parseFloat(data.customCashback) / 100 : undefined,

            capsuleCount: data.capsule_count ? parseInt(data.capsule_count) : undefined,
            capsuleVolume: data.capsule_volume || undefined,
            servingsPerContainer: data.servings_per_container ? parseInt(data.servings_per_container) : undefined,
            manufacturer: data.manufacturer || undefined,
            countryOfOrigin: data.country_of_origin || undefined,
            expirationDate: data.expiration_date || undefined,
            storageConditions: data.storage_conditions || undefined,
            usage: data.usage || undefined,
            additionalInfo: data.additional_info || undefined,
            howToTake:
                (data.how_to_take as 'morning' | 'morning_evening' | 'with_meals' | 'before_meals' | 'custom') || undefined,

            benefits: benefits.length > 0 ? benefits : undefined,

            composition:
                compositionRows.filter((r) => r.component.trim() || r.amount.trim()).length > 0
                    ? compositionRows.reduce((acc, r) => {
                        if (r.component.trim()) acc[r.component] = r.amount;
                        return acc;
                    }, {} as Record<string, string>)
                    : undefined,

            // SEO: если не заполнены, используем name/description
            seoTitle: data.seo_title?.trim() || data.name,
            seoDescription: data.seo_description?.trim() || data.description || undefined,
            seoKeywords: data.seo_keywords?.trim() || undefined,

            uiStatus: isActive ? ('active' as const) : ('inactive' as const),

            // Отправляем массив метаданных [{mediaId, role, alt, sortOrder}]
            images: images,
        };

        try {
            if (product?.id) {
                await updateProduct({ id: product.id, ...productData }).unwrap();
                toast({ title: 'Товар обновлен', description: 'Товар успешно обновлен' });
            } else {
                await createProduct(productData).unwrap();
                toast({ title: 'Товар создан', description: 'Товар успешно добавлен в каталог' });
            }
            onSuccess();
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || `Не удалось сохранить товар`,
                variant: 'destructive',
            });
        }
    };

    const handleImagesChange = (newImages: ProductImageMetadata[]) => {
        setImages(ensureRoles(newImages));
    };

    const addBenefit = () => {
        if (currentBenefit.trim()) {
            setBenefits((prev) => [...prev, currentBenefit.trim()]);
            setCurrentBenefit('');
        }
    };

    const removeBenefit = (index: number) => {
        setBenefits((prev) => prev.filter((_, i) => i !== index));
    };

    const addCompositionRow = () => {
        setCompositionRows((prev) => [...prev, { component: '', amount: '' }]);
    };

    const removeCompositionRow = (index: number) => {
        setCompositionRows((prev) => prev.filter((_, i) => i !== index));
    };

    const updateCompositionRow = (index: number, field: 'component' | 'amount', value: string) => {
        setCompositionRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Основная информация */}
            <Card>
                <CardHeader>
                    <CardTitle>Основная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Label htmlFor="name">
                                Название товара * <span className="text-xs text-blue-600">(Title для SEO)</span>
                            </Label>
                        </div>
                        <Input id="name" {...register('name', { required: 'Название обязательно' })} placeholder="Название товара" />
                        <div className="text-xs text-gray-500 mt-1">
                            🎯 SEO: Используется как заголовок H1 на странице товара и в мета-теге title
                        </div>
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message as string}</p>}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Label htmlFor="description">
                                Краткое описание <span className="text-xs text-blue-600">(Meta Description)</span>
                            </Label>
                        </div>
                        <Textarea id="description" {...register('description')} placeholder="Краткое описание товара" />
                        <div className="text-xs text-gray-500 mt-1">
                            🎯 SEO: Отображается в карточках товаров и используется для мета-описания страницы
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="slug">
                            URL адрес товара * <span className="text-xs text-blue-600">(SEO URL)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">https://vitawin.ru/product/</span>
                            <Input
                                id="slug"
                                {...register('slug', {
                                    required: 'URL адрес обязателен',
                                    validate: (value) => {
                                        if (!value) return 'URL адрес обязателен';
                                        if (/^\d+$/.test(value)) return 'URL не должен состоять только из цифр';
                                        if (!/^[a-z0-9-]+$/.test(value)) return 'URL может содержать только строчные буквы, цифры и дефисы';
                                        return true;
                                    },
                                })}
                                placeholder="berberinplus-120caps"
                                className="flex-1"
                                onChange={(e) => setValue('slug', e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">🎯 SEO: ЧПУ для страницы товара. Используйте только буквы, цифры и дефисы</div>
                        {errors.slug && <p className="text-red-500 text-sm">{String(errors.slug.message)}</p>}
                        {watch('slug') && !errors.slug && (
                            <div className="text-xs text-emerald-600 mt-1">Полная ссылка: https://vitawin.ru/product/{watch('slug')}</div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Label htmlFor="long_description">
                                Полное описание <span className="text-xs text-blue-600">(Контент для SEO)</span>
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    if (!watch('name')) {
                                        toast({
                                            title: 'Ошибка',
                                            description: 'Сначала введите название товара',
                                            variant: 'destructive',
                                        });
                                        return;
                                    }
                                    setIsGeneratingArticle(true);
                                    try {
                                        const response = await axiosApi.post('/ai/generate-full-article', {
                                            title: watch('name'),
                                            description: watch('description'),
                                            category: watch('category'),
                                        });
                                        setValue('long_description', response.data.article);
                                        toast({
                                            title: 'Статья создана! ✨',
                                            description: `Научная статья ${response.data.character_count} символов готова`,
                                        });
                                    } catch {
                                        toast({
                                            title: 'Ошибка',
                                            description: 'Не удалось создать статью',
                                            variant: 'destructive',
                                        });
                                    } finally {
                                        setIsGeneratingArticle(false);
                                    }
                                }}
                                disabled={isGeneratingArticle || !watch('name')}
                                className="shrink-0"
                            >
                                {isGeneratingArticle ? (
                                    <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Создаю...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-3 h-3 mr-1" />
                                        Статья ИИ
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border">
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n# Заголовок H1\n');
                                    }}
                                >
                                    H1
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n## Заголовок H2\n');
                                    }}
                                >
                                    H2
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n### Заголовок H3\n');
                                    }}
                                >
                                    H3
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n#### Заголовок H4\n');
                                    }}
                                >
                                    H4
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n##### Заголовок H5\n');
                                    }}
                                >
                                    H5
                                </button>
                                <div className="border-l mx-2"></div>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n- Элемент списка\n');
                                    }}
                                >
                                    • Список
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n**Жирный текст**\n');
                                    }}
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const currentText = watch('long_description') || '';
                                        setValue('long_description', currentText + '\n*Курсив*\n');
                                    }}
                                >
                                    I
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                                    onClick={() => {
                                        const text = prompt('Введите текст ссылки:');
                                        const url = prompt('Введите URL:');
                                        if (text && url) {
                                            const currentText = watch('long_description') || '';
                                            setValue('long_description', currentText + `\n[${text}](${url})\n`);
                                        }
                                    }}
                                >
                                    🔗
                                </button>
                            </div>
                            <Textarea
                                id="long_description"
                                {...register('long_description')}
                                placeholder={`Полное описание товара с поддержкой Markdown: 
# Заголовок H1
## Заголовок H2
### Заголовок H3
**Жирный текст**
*Курсив*
- Элемент списка`}
                                rows={8}
                                className="font-mono text-sm"
                            />
                            <div className="text-xs text-gray-500">
                                💡 Используйте кнопки выше или Markdown разметку: # H1, ## H2, ### H3, **жирный**, *курсив*, - списки
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                                🎯 SEO: Создает статью с микроразметкой Schema.org для лучшего ранжирования в поиске
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="price">Цена *</Label>
                            <Input id="price" type="number" step="0.01" {...register('price', { required: 'Цена обязательна', min: 0 })} placeholder="0.00" />
                            {errors.price && <p className="text-red-500 text-sm">{errors.price.message as string}</p>}
                        </div>

                        <div>
                            <Label htmlFor="original_price">Первоначальная цена</Label>
                            <Input id="original_price" type="number" step="0.01" {...register('original_price', { min: 0 })} placeholder="0.00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="category">Категория *</Label>
                            <Select value={selectedCategoryId} onValueChange={(value) => setSelectedCategoryId(value)} disabled={categoriesLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder={categoriesLoading ? 'Загрузка...' : 'Выберите категорию'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!selectedCategoryId && <p className="text-red-500 text-sm">Выберите категорию</p>}
                        </div>

                        <div>
                            <Label htmlFor="badge">Бейдж</Label>
                            <Select
                                value={selectedBadge}
                                onValueChange={(value) => {
                                    setSelectedBadge(value);
                                    setValue('badge', value);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите бейдж" />
                                </SelectTrigger>
                                <SelectContent>
                                    {BADGES.map((badge) => (
                                        <SelectItem key={badge} value={badge}>
                                            {badge}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="stock">Количество на складе *</Label>
                            <Input id="stock" type="number" {...register('stock', { required: 'Количество обязательно', min: 0 })} placeholder="0" />
                            {errors.stock && <p className="text-red-500 text-sm">{errors.stock.message as string}</p>}
                        </div>

                        <div>
                            <Label htmlFor="status">Статус</Label>
                            <Select onValueChange={(value: 'active' | 'inactive') => setValue('status', value)} defaultValue={watch('status')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Активный</SelectItem>
                                    <SelectItem value="inactive">Неактивный</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="sku">SKU</Label>
                            <Input id="sku" {...register('sku')} placeholder="PROD-001" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Изображения (UI) */}
            <Card>
                <CardHeader>
                    <CardTitle>Изображения товара</CardTitle>
                    <CardDescription>Загрузите изображения товара. Первое изображение будет главным.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ImageUploader images={images} onImagesChange={handleImagesChange} />
                </CardContent>
            </Card>

            {/* Дополнительная информация */}
            <Card>
                <CardHeader>
                    <CardTitle>Дополнительная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="capsule_count">Количество капсул</Label>
                            <Input id="capsule_count" type="number" {...register('capsule_count', { min: 0 })} placeholder="60" />
                        </div>

                        <div>
                            <Label htmlFor="capsule_volume">Объем капсулы</Label>
                            <Input id="capsule_volume" {...register('capsule_volume')} placeholder="500mg" />
                        </div>

                        <div>
                            <Label htmlFor="servings_per_container">Порций в упаковке</Label>
                            <Input id="servings_per_container" type="number" {...register('servings_per_container', { min: 0 })} placeholder="30" />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="key_benefits">Ключевые преимущества</Label>
                        <Textarea
                            id="key_benefits"
                            {...(register as any)('key_benefits')}
                            placeholder={`Поддерживает здоровый уровень сахара в крови
Способствует здоровому контролю веса
Помогает снижать воспаление`}
                            rows={4}
                        />
                        <div className="text-xs text-gray-500 mt-1">💡 Каждое преимущество пишите с новой строки</div>
                    </div>

                    <div>
                        <Label htmlFor="quality_guarantee">Гарантия качества</Label>
                        <Textarea
                            id="quality_guarantee"
                            {...(register as any)('quality_guarantee')}
                            placeholder={`Протестировано третьей стороной на чистоту и эффективность
Экстракт высочайшего качества 97% концентрации
Без тяжелых металлов и других загрязнителей`}
                            rows={4}
                        />
                        <div className="text-xs text-gray-500 mt-1">💡 Каждый пункт гарантии пишите с новой строки</div>
                    </div>

                    <div>
                        <Label htmlFor="composition">Состав</Label>
                        <Input id="composition" {...(register as any)('composition')} placeholder="Витамин D3, желатин, глицерин" />
                    </div>

                    <div>
                        <Label>Состав и пищевая ценность (таблица)</Label>
                        <div className="space-y-2">
                            {compositionRows.map((row, index) => (
                                <div key={index} className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Компонент (например: Витамин D3)"
                                        value={row.component}
                                        onChange={(e) => updateCompositionRow(index, 'component', e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Дозировка (например: 5000 МЕ)"
                                            value={row.amount}
                                            onChange={(e) => updateCompositionRow(index, 'amount', e.target.value)}
                                        />
                                        {compositionRows.length > 1 && (
                                            <Button type="button" variant="outline" size="sm" onClick={() => removeCompositionRow(index)}>
                                                ✕
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addCompositionRow}>
                                + Добавить компонент
                            </Button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">💡 Добавьте компоненты и их дозировки в отдельные поля</div>
                    </div>

                    <div>
                        <Label htmlFor="nutrition_facts">Дополнительная информация о составе</Label>
                        <Textarea
                            id="nutrition_facts"
                            {...(register as any)('nutrition_facts')}
                            placeholder="Дополнительные компоненты: Желатин (капсула), глицерин, очищенная вода."
                            rows={3}
                        />
                        <div className="text-xs text-gray-500 mt-1">💡 Укажите дополнительную информацию о составе</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="manufacturer">Производитель</Label>
                            <Input id="manufacturer" {...register('manufacturer')} placeholder="Название производителя" />
                        </div>

                        <div>
                            <Label htmlFor="country_of_origin">Страна производства</Label>
                            <Input id="country_of_origin" {...register('country_of_origin')} placeholder="США" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="expiration_date">Срок годности</Label>
                            <Input id="expiration_date" {...register('expiration_date')} placeholder="2 года" />
                        </div>

                        <div>
                            <Label htmlFor="how_to_take">Рекомендуемое время приема</Label>
                            <Select onValueChange={(value) => (setValue as any)('how_to_take', value)} defaultValue={watch('how_to_take')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите время приема" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="morning">Утром</SelectItem>
                                    <SelectItem value="morning_evening">Утром и вечером</SelectItem>
                                    <SelectItem value="with_meals">С едой</SelectItem>
                                    <SelectItem value="before_meals">До еды</SelectItem>
                                    <SelectItem value="custom">Индивидуально</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="text-xs text-gray-500 mt-1">💡 Выберите оптимальное время для приема препарата</div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="storage_conditions">Условия хранения</Label>
                        <Input id="storage_conditions" {...register('storage_conditions')} placeholder="Хранить в сухом прохладном месте" />
                    </div>

                    <div>
                        <Label htmlFor="usage">Способ применения</Label>
                        <Textarea id="usage" {...register('usage')} placeholder="Принимать по 1 капсуле в день" />
                    </div>

                    <div>
                        <Label htmlFor="benefits_text">Польза</Label>
                        <Textarea id="benefits_text" {...(register as any)('benefits_text')} placeholder="Описание пользы товара для характеристик" />
                    </div>

                    <div>
                        <Label htmlFor="additional_info">Дополнительная информация</Label>
                        <Textarea id="additional_info" {...register('additional_info')} placeholder="Дополнительная информация о товаре" />
                    </div>
                </CardContent>
            </Card>

            {/* PV и Кешбэк */}
            <Card>
                <CardHeader>
                    <CardTitle>Настройки PV и Кешбэка</CardTitle>
                    <p className="text-sm text-gray-600">
                        Настройте персональные значения PV и кешбэка для товара. Если поля пустые, будет использоваться автоматический расчет.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="customPv">Кастомный PV (Personal Volume)</Label>
                            <Input
                                id="customPv"
                                type="number"
                                {...register('customPv', { min: 0 })}
                                placeholder="Оставьте пустым для автоматического расчёта"
                            />
                        </div>

                        <div>
                            <Label htmlFor="customCashback">Кастомный кэшбек (%)</Label>
                            <Input
                                id="customCashback"
                                type="number"
                                step="0.01"
                                min={0}
                                max={100}
                                {...register('customCashback', { min: 0 })}
                                placeholder="5"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                        Предварительный расчет при цене {watch('price') || 0} ₽:
                        <br />• PV: {watch('customPv') !== '' ? Number(watch('customPv')) : Math.floor((Number(watch('price')) || 0) / 200)} PV
                        <br />• Кэшбек:{" "}
                        {(() => {
                            const price = Number(watch('price')) || 0;
                            const pct = watch('customCashback') !== '' ? Number(watch('customCashback')) : 5;
                            return Math.ceil((price * pct) / 100);
                        })()}{" "}
                        ₽
                    </div>
                </CardContent>
            </Card>

            {/* Польза */}
            <Card>
                <CardHeader>
                    <CardTitle>Польза товара</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                value={currentBenefit}
                                onChange={(e) => setCurrentBenefit(e.target.value)}
                                placeholder="Добавить пользу"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                            />
                            <Button type="button" onClick={addBenefit}>
                                Добавить
                            </Button>
                        </div>

                        {benefits.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {benefits.map((benefit, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                        {benefit}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0"
                                            onClick={() => removeBenefit(index)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* SEO */}
            <Card>
                <CardHeader>
                    <CardTitle>SEO оптимизация</CardTitle>
                    <CardDescription>
                        Если поля не заполнены, будут использованы название и описание товара
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="seo_title">SEO Title</Label>
                        <Input
                            id="seo_title"
                            {...register('seo_title')}
                            placeholder={watch('name') || 'Название товара будет использовано как title'}
                            maxLength={60}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Рекомендуемая длина: 50-60 символов. Текущая: {(watch('seo_title') || '').length}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="seo_description">SEO Description</Label>
                        <Textarea
                            id="seo_description"
                            {...register('seo_description')}
                            placeholder={watch('description') || 'Краткое описание будет использовано как description'}
                            rows={3}
                            maxLength={160}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Рекомендуемая длина: 120-160 символов. Текущая: {(watch('seo_description') || '').length}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="seo_keywords">SEO Keywords</Label>
                        <Input
                            id="seo_keywords"
                            {...register('seo_keywords')}
                            placeholder="витамины, бад, здоровье, иммунитет"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            💡 Разделяйте ключевые слова запятыми
                        </div>
                    </div>

                    {(watch('seo_title') || watch('seo_description')) && (
                        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                            <div className="font-semibold text-blue-900">Предпросмотр в Google:</div>
                            <div>
                                <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                                    {watch('seo_title') || watch('name')}
                                </div>
                                <div className="text-green-700 text-sm">
                                    https://vitawin.ru/product/{watch('slug')}
                                </div>
                                <div className="text-gray-600 text-sm">
                                    {(watch('seo_description') || watch('description') || '').slice(0, 160)}
                                    {(watch('seo_description') || watch('description') || '').length > 160 && '...'}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Кнопки */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    {product?.id && (
                        <Button
                            type="button"
                            variant={isActive ? 'default' : 'secondary'}
                            onClick={toggleActiveStatus}
                            className={`${isActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-500 hover:bg-gray-600'} text-white`}
                        >
                            {isActive ? (
                                <>
                                    <ToggleRight className="w-4 h-4 mr-2" />
                                    Активен
                                </>
                            ) : (
                                <>
                                    <ToggleLeft className="w-4 h-4 mr-2" />
                                    Неактивен
                                </>
                            )}
                        </Button>
                    )}
                </div>

                <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Отмена
                    </Button>
                    <Button type="submit">{product?.id ? 'Обновить товар' : 'Создать товар'}</Button>
                </div>
            </div>
        </form>
    );
}
