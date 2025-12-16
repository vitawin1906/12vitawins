
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BasicInfoSectionProps {
  formData: {
    title: string;
    excerpt: string;
    author: string;
    publishDate: string;
    category: string;
    customUrl: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors?: Record<string, string>;
}

const BasicInfoSection = ({ formData, onChange, errors = {} }: BasicInfoSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Основная информация</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Заголовок *</Label>
            <Input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={onChange}
              required
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="category">Категория *</Label>
            <Input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={onChange}
              required
              className={errors.category ? 'border-red-500' : ''}
            />
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>
        </div>
        
        <div>
          <Label htmlFor="customUrl">URL адрес статьи *</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">https://vitawin.ru/blog/</span>
            <Input
              type="text"
              id="customUrl"
              name="customUrl"
              value={formData.customUrl}
              onChange={onChange}
              placeholder="vitamin-d3-benefits"
              className="flex-1"
              required
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            🎯 URL адрес вашей статьи. Можете использовать любые символы, какие хотите
          </div>
          {errors.customUrl && <p className="text-red-500 text-sm mt-1">{errors.customUrl}</p>}
          {formData.customUrl && !errors.customUrl && (
            <div className="text-xs text-emerald-600 mt-1">
              Полная ссылка: https://vitawin.ru/blog/{formData.customUrl}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="excerpt">Краткое описание *</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={onChange}
            placeholder="Краткое описание статьи для превью и поиска"
            className={`min-h-[100px] ${errors.excerpt ? 'border-red-500' : ''}`}
            required
          />
          {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="author">Автор</Label>
            <Input
              type="text"
              id="author"
              name="author"
              value={formData.author}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="publishDate">Дата публикации *</Label>
            <Input
              type="date"
              id="publishDate"
              name="publishDate"
              value={formData.publishDate}
              onChange={onChange}
              placeholder="Выберите дату публикации"
              className={errors.publishDate ? 'border-red-500' : ''}
              required
            />
            {errors.publishDate && <p className="text-red-500 text-sm mt-1">{errors.publishDate}</p>}
            <div className="text-xs text-gray-500 mt-1">
              📅 Дата когда статья будет опубликована
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicInfoSection;
