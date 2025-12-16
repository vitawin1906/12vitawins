import { Edit, Search, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {Product} from '@/store/api/domains/productsApi';
type ImageMeta = {
    alt?: string;
    role?: 'main' | 'gallery';
    mediaId?: string;        // у тебя это часто прям URL
    url?: string;            // на будущее
    secureUrl?: string;      // на будущее
    sortOrder?: number;
};

// Узнаём, мета это или просто строка
const isMeta = (v: unknown): v is ImageMeta =>
    !!v && typeof v === 'object' && ('mediaId' in (v as any) || 'url' in (v as any) || 'secureUrl' in (v as any));

// Достаём главную картинку (main) или первый элемент
function getMainImage(images: unknown): { src: string; alt?: string } {
    if (!images) return { src: '' };

    const arr = Array.isArray(images) ? images : [images];

    // Пытаемся найти main среди мета-объектов
    const chosen =
        (arr.find((i) => isMeta(i) && i.role === 'main')) ??
        arr[0];

    if (typeof chosen === 'string') {
        return { src: chosen };
    }
    if (isMeta(chosen)) {
        const src = chosen.url || chosen.secureUrl || chosen.mediaId || '';
        return { src, alt: chosen.alt };
    }
    return { src: '' };
}

export interface ProductListProps {
    products: Product[];
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
}

export function ProductList({ products, searchTerm, onSearchChange, onEdit, onDelete }: ProductListProps) {
    return (
        <div>
            <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Поиск товаров..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Товар</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Цена</TableHead>
                        <TableHead>Склад</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(products || []).map((product) => {
                        // поддержка и старого, и нового формата изображений
                        const img = getMainImage((product as any).images);
                        const imgSrc = img.src || '/placeholder.svg';
                        const imgAlt = img.alt || product.name;

                        // категория может быть строкой или объектом { name }
                        const categoryName =
                            (product as any).category?.name ??
                            (product as any).category ??
                            '—';

                        // поддержим оба поля для originalPrice (camel/snake)
                        const originalPrice = (product as any).originalPrice ?? (product as any).original_price;

                        // статус по умолчанию — активный
                        const status = (product as any).status ?? 'active';

                        return (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <img
                                            src={imgSrc}
                                            alt={imgAlt}
                                            className="h-10 w-10 object-cover rounded bg-gray-100"
                                            loading="lazy"
                                        />
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-gray-500">
                                                {typeof product.description === 'string' && product.description.length > 0
                                                    ? (product.description.length > 50
                                                        ? product.description.slice(0, 50) + '…'
                                                        : product.description)
                                                    : 'Нет описания'}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell>
                                    <Badge variant="secondary">{categoryName}</Badge>
                                </TableCell>

                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="font-medium">{product.price} ₽</div>
                                        {typeof originalPrice === 'number' && originalPrice > (product.price || 0) && (
                                            <div className="text-sm text-gray-500 line-through">{originalPrice} ₽</div>
                                        )}
                                    </div>
                                </TableCell>

                                <TableCell>
                                    <Badge variant={product.stock > 50 ? 'default' : product.stock > 0 ? 'secondary' : 'destructive'}>
                                        {product.stock} шт.
                                    </Badge>
                                </TableCell>

                                <TableCell>
                                    <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                                        {status === 'active' ? 'Активный' : 'Неактивный'}
                                    </Badge>
                                </TableCell>

                                <TableCell>
                                    <div className="flex space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => onDelete(product.id)}>
                                            <Trash className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
