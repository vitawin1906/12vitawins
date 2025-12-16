// client/src/components/admin/ProductManagement.tsx
import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProductForm } from './ProductForm';
import { ProductList } from './ProductList';
import {
    useGetAdminProductsQuery,
    useDeleteProductMutation,
    Product,
} from '@/store/api/domains/productsApi';

// ——— утилита: превращаем все форматы категорий в человекочитаемую строку
const getCategoryName = (p: any): string => {
    const cats = p?.categories;         // возможный массив категорий
    const cat = p?.category;            // возможна строка или объект
    if (Array.isArray(cats)) {
        return cats
            .map((c) =>
                typeof c === 'string'
                    ? c
                    : c?.name ?? c?.slug ?? ''
            )
            .filter(Boolean)
            .join(', ');
    }
    if (typeof cat === 'string') return cat;
    if (cat && typeof cat === 'object') return cat.name ?? cat.slug ?? '';
    if (Array.isArray(p?.categoryIds)) return p.categoryIds.join(', ');
    return '';
};

const ProductManagement = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // ✅ RTK Query
    const { data: products = [], isLoading, isError, refetch } = useGetAdminProductsQuery();
    const [deleteProduct] = useDeleteProductMutation();

    // 1) Нормализуем категории, чтобы в UI всегда была строка
    const productsWithCategory = useMemo(
        () =>
            products.map((p: any) => ({
                ...p,
                // принудительно кладём строку — чтобы ProductList не получил объект
                category: getCategoryName(p) as unknown as string,
                // при желании можно оставить и отдельное поле для явного использования:
                categoryName: getCategoryName(p),
            })),
        [products]
    );

    // 2) Фильтрация по имени/категории уже по нормализованной строке
    const filteredProducts = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return productsWithCategory.filter((product) => {
            const name = (product.name || (product as any).title || '').toLowerCase();
            const categoryName = ((product as any).category || (product as any).categoryName || '').toLowerCase();
            return name.includes(searchLower) || categoryName.includes(searchLower);
        });
    }, [productsWithCategory, searchTerm]);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteProduct(id).unwrap();
            toast({
                title: 'Товар удалён',
                description: 'Товар успешно удалён из каталога',
            });
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Не удалось удалить товар',
                variant: 'destructive',
            });
        }
    };

    if (isError) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-red-600">
                            <p>Ошибка загрузки товаров</p>
                            <Button onClick={() => refetch()} className="mt-4">
                                Попробовать снова
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Управление товарами</h2>
                    <p className="text-gray-600">Добавляйте, редактируйте и управляйте товарами</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingProduct(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить товар
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingProduct ? 'Измените информацию о товаре' : 'Заполните информацию о новом товаре'}
                            </DialogDescription>
                        </DialogHeader>
                        <ProductForm
                            product={editingProduct}
                            onSuccess={() => {
                                setIsDialogOpen(false);
                                setEditingProduct(null);
                            }}
                            onCancel={() => {
                                setIsDialogOpen(false);
                                setEditingProduct(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Список товаров</CardTitle>
                    <CardDescription>
                        {isLoading ? 'Загрузка…' : `Всего товаров: ${productsWithCategory.length}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProductList
                        // отдаём уже безопасные данные — category точно строка
                        products={filteredProducts as unknown as Product[]}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export { ProductManagement };
