
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { axiosApi } from '@/lib/axiosApi';

interface MediaSectionProps {
  formData: {
    imageUrl: string;
    videoUrl: string;
    galleryImages: string[];
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGalleryChange: (images: string[]) => void;
  onImageUrlChange: (url: string) => void;
}

const MediaSection = ({ formData, onChange, onGalleryChange, onImageUrlChange }: MediaSectionProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Можно загружать только изображения",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axiosApi.post('/admin/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.imageUrl) {
        onImageUrlChange(response.data.imageUrl);
        toast({
          title: "Успешно",
          description: "Изображение загружено"
        });
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить изображение",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAddGalleryImage = () => {
    const newImageUrl = prompt('Введите URL изображения:');
    if (newImageUrl) {
      onGalleryChange([...formData.galleryImages, newImageUrl]);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    onGalleryChange(formData.galleryImages.filter((_, i) => i !== index));
  };

  const handleGalleryImageChange = (index: number, value: string) => {
    const newGalleryImages = [...formData.galleryImages];
    newGalleryImages[index] = value;
    onGalleryChange(newGalleryImages);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Медиа контент</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <Label htmlFor="imageUrl">Обложка статьи</Label>
          
          {/* Upload button */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Загрузка...' : 'Загрузить изображение'}
              </Button>
              
              {formData.imageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onImageUrlChange('')}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Удалить
                </Button>
              )}
            </div>
            
            {/* Preview */}
            {formData.imageUrl && (
              <div className="border rounded-lg p-2 bg-gray-50">
                <img
                  src={formData.imageUrl}
                  alt="Обложка статьи"
                  className="w-full h-48 object-cover rounded"
                />
                <p className="text-sm text-gray-600 mt-2 truncate">{formData.imageUrl}</p>
              </div>
            )}
            
            {/* Manual URL input */}
            <div>
              <Label htmlFor="imageUrl" className="text-sm text-gray-600">Или введите URL изображения</Label>
              <Input
                type="text"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={onChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="videoUrl">URL видео (опционально)</Label>
          <Input
            type="text"
            id="videoUrl"
            name="videoUrl"
            value={formData.videoUrl}
            onChange={onChange}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        <div>
          <Label>Галерея изображений</Label>
          <div className="space-y-2">
            {(formData.galleryImages || []).map((imageUrl, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => handleGalleryImageChange(index, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleRemoveGalleryImage(index)}
                >
                  Удалить
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddGalleryImage}
            >
              Добавить изображение
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaSection;
