import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import { useGetPublicProductsQuery } from '@/store/api/domains';
import { getMainProductImage } from '@/utils/imageUtils'; // ← У тебя есть такой утил!

interface ProductSelectorProps {
    selectedProducts: string[];
    onProductsChange: (productIds: string[]) => void;
}

const ProductSelector = ({ selectedProducts, onProductsChange }: ProductSelectorProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: products = [], isLoading } = useGetPublicProductsQuery({
        status: 'active',
        limit: 200
    });

    // Фильтрация по title/name/category
    const filteredProducts = products.filter((product: any) => {
        const t = searchTerm.toLowerCase();
        return (
            product.title?.toLowerCase().includes(t) ||
            product.name?.toLowerCase().includes(t) ||
            product.category?.name?.toLowerCase().includes(t)
        );
    });

    const toggleProduct = (productId: string) => {
        if (selectedProducts.includes(productId)) {
            onProductsChange(selectedProducts.filter(id => id !== productId));
        } else {
            onProductsChange([...selectedProducts, productId]);
        }
    };

    const removeProduct = (id: string) => {
        onProductsChange(selectedProducts.filter(pid => pid !== id));
    };

    const selectedProductsData = products.filter((p: any) =>
        selectedProducts.includes(p.id)
    );

    if (isLoading) {
        return <div className="text-center py-4">Загрузка товаров...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Выбранные товары */}
            {selectedProductsData.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">
                        Выбранные товары ({selectedProductsData.length})
                    </h4>

                    <div className="space-y-2">
                        {selectedProductsData.map((product: any) => {
                            const img = getMainProductImage(product);

                            return (
                                <div
                                    key={product.id}
                                    className="flex items-center space-x-3 p-2 bg-emerald-50 rounded border"
                                >
                                    <img
                                        src={img}
                                        className="w-10 h-10 object-contain rounded"
                                        alt={product.title || product.name}
                                    />

                                    <div className="flex-grow">
                    <span className="font-medium text-sm">
                      {product.title || product.name}
                    </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => removeProduct(product.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Поиск */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск товаров..."
                    className="pl-10"
                />
            </div>

            {/* Список товаров */}
            <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredProducts.map((product: any) => {
                    const img = getMainProductImage(product);

                    return (
                        <Card key={product.id} className="border border-gray-200">
                            <CardContent className="p-4">
                                <div className="flex items-start space-x-4">
                                    <Checkbox
                                        id={`product-${product.id}`}
                                        checked={selectedProducts.includes(product.id)}
                                        onCheckedChange={() => toggleProduct(product.id)}
                                    />

                                    <img
                                        src={img}
                                        alt={product.title || product.name}
                                        className="w-16 h-16 object-contain rounded"
                                    />

                                    <div className="flex-grow min-w-0">
                                        <Label htmlFor={`product-${product.id}`} className="cursor-pointer">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h4 className="font-medium text-gray-900 truncate">
                                                    {product.title || product.name}
                                                </h4>

                                                {product.badge && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {product.badge}
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                {product.description}
                                            </p>

                                            <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {product.price} ₽
                        </span>

                                                {product.originalPrice &&
                                                    product.originalPrice > product.price && (
                                                        <span className="text-sm text-gray-500 line-through">
                              {product.originalPrice} ₽
                            </span>
                                                    )}
                                            </div>
                                        </Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default ProductSelector;
