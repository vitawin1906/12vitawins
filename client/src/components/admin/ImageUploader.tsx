// ImageUploader.tsx
import { X, Upload, Image as ImageIcon, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { ProductImageMetadata } from '@/types/product';
import { useEffect, useState } from 'react';

interface ImageUploaderProps {
    images: ProductImageMetadata[];
    onImagesChange: (images: ProductImageMetadata[]) => void;
}

// Ровно один main (первый), корректный sortOrder
const normalizeImages = (arr: ProductImageMetadata[]): ProductImageMetadata[] => {
    const sorted = [...arr].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return sorted.map((img, idx): ProductImageMetadata => ({
        ...img,
        sortOrder: idx,
        role: (idx === 0 ? 'main' : 'gallery') as 'main' | 'gallery',
    }));
};

export function ImageUploader({ images, onImagesChange }: ImageUploaderProps) {
    const [uploadingImages, setUploadingImages] = useState<Array<{
        id: string;
        file: File;
        preview: string;
        progress: number;
        status: 'uploading' | 'success' | 'error';
        error?: string;
    }>>([]);

    // Если массив пришёл без корректных ролей — поправим один раз
    useEffect(() => {
        if (!images?.length) return;
        const normalized = normalizeImages(images);
        const same =
            images.length === normalized.length &&
            images.every((img, i) => img.role === normalized[i].role && img.sortOrder === normalized[i].sortOrder);

        if (!same) onImagesChange(normalized);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;

        const batch = Array.from(files).map((file) => ({
            id:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            preview: URL.createObjectURL(file),
            progress: 0,
            status: 'uploading' as const,
        }));
        setUploadingImages((prev) => [...prev, ...batch]);

        for (const item of batch) {
            try {
                if (item.file.size > 5 * 1024 * 1024) {
                    throw new Error('Файл > 5MB');
                }

                const uploaded = await uploadToCloudinary(item.file, {
                    folder: 'products',
                    onProgress: (p: number) =>
                        setUploadingImages((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: p } : x))),
                });

                const newImage: ProductImageMetadata = {
                    mediaId: uploaded.public_id,    // ✅ Cloudinary public_id
                    url: uploaded.secure_url,       // ✅ Cloudinary secure_url
                    role: (images.length === 0 ? 'main' : 'gallery') as 'main' | 'gallery',
                    alt: item.file.name.replace(/\.[^/.]+$/, ''),
                    sortOrder: images.length,
                };

                onImagesChange(normalizeImages([...images, newImage]));

                setUploadingImages((prev) =>
                    prev.map((x) => (x.id === item.id ? { ...x, status: 'success', progress: 100 } : x)),
                );

                setTimeout(() => {
                    setUploadingImages((prev) => {
                        const itm = prev.find((i) => i.id === item.id);
                        if (itm) URL.revokeObjectURL(itm.preview);
                        return prev.filter((i) => i.id !== item.id);
                    });
                }, 2000);
            } catch (err: any) {
                const msg = err?.message || 'Ошибка загрузки';
                setUploadingImages((prev) =>
                    prev.map((x) => (x.id === item.id ? { ...x, status: 'error', error: msg } : x)),
                );
                toast.error(msg);
            }
        }

        event.target.value = '';
    };

    const removeImage = (index: number) => {
        if (index < 0 || index >= images.length) return;

        const next = images.filter((_, i) => i !== index);

        if (next.length === 0) {
            onImagesChange([]);
            toast.success('Изображение удалено');
            return;
        }

        onImagesChange(normalizeImages(next));
        toast.success('Изображение удалено');
    };

    const setMainImage = (index: number) => {
        if (index < 0 || index >= images.length) return;
        const next = images.slice();
        const [picked] = next.splice(index, 1);
        const reordered = normalizeImages([picked, ...next]);
        onImagesChange(reordered);
        toast.success('Главное изображение обновлено');
    };

    const removeUploadingImage = (id: string) => {
        setUploadingImages((prev) => {
            const itm = prev.find((i) => i.id === id);
            if (itm) URL.revokeObjectURL(itm.preview);
            return prev.filter((i) => i.id !== id);
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImages.some((i) => i.status === 'uploading')}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImages.some((i) => i.status === 'uploading') ? 'Загрузка...' : 'Добавить изображения'}
                </Button>
                <input id="image-upload" type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                <span className="text-sm text-gray-500">PNG, JPG, WEBP до 5MB</span>
            </div>

            {/* Загружающиеся изображения */}
            {uploadingImages.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Загрузка изображений</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadingImages.map((uploadItem) => (
                            <div key={uploadItem.id} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden border border-gray-300 bg-gray-50">
                                    <img src={uploadItem.preview} alt="Uploading" className="w-full h-full object-cover" />
                                    {uploadItem.status === 'uploading' && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                                            <Progress value={uploadItem.progress} className="w-2/3" />
                                            <span className="text-white text-xs mt-2">{Math.round(uploadItem.progress)}%</span>
                                        </div>
                                    )}
                                    {uploadItem.status === 'success' && (
                                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                                            <div className="bg-green-500 text-white rounded-full p-2">✓</div>
                                        </div>
                                    )}
                                    {uploadItem.status === 'error' && (
                                        <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                                            <div className="text-white text-center p-2">
                                                <X className="h-8 w-8 mx-auto mb-1" />
                                                <span className="text-xs">{uploadItem.error}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {uploadItem.status !== 'success' && (
                                    <button
                                        type="button"
                                        onClick={() => removeUploadingImage(uploadItem.id)}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Загруженные изображения */}
            {images.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Загруженные изображения ({images.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.map((img, index) => (
                            <div key={index} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-emerald-500 transition-colors">
                                    <img
                                        src={img.url}
                                        alt={img.alt || `Товар ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EНет изображения%3C/text%3E%3C/svg%3E';
                                        }}
                                    />
                                </div>
                                {img.role === 'main' && (
                                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                        <Star className="h-3 w-3" />
                                        Главное
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    {img.role !== 'main' && (
                                        <button
                                            type="button"
                                            onClick={() => setMainImage(index)}
                                            className="bg-white text-gray-700 rounded-full p-1 shadow-md hover:bg-gray-100"
                                            title="Сделать главным"
                                        >
                                            <Star className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                        title="Удалить"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {images.length === 0 && uploadingImages.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Изображения не добавлены</p>
                    <p className="text-sm text-gray-400">Добавьте хотя бы одно изображение товара</p>
                </div>
            )}
        </div>
    );
}
