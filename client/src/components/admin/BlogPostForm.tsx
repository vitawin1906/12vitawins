// client/src/components/admin/BlogPostForm.tsx
import {  useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  useCreatePostMutation,
  useUpdatePostMutation,
  BlogPost,
  CreateBlogPostDto,
  UpdateBlogPostDto,
} from '@/store/api/domains';
import { useGetAdminCategoriesQuery } from '@/store/api/domains';

interface BlogPostFormProps {
  post?: BlogPost | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BlogPostForm({ post, onSuccess, onCancel }: BlogPostFormProps) {
  const { toast } = useToast();
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const { data: categories = [], isLoading: categoriesLoading } = useGetAdminCategoriesQuery();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      title: post?.title || '',
      excerpt: post?.excerpt || '',
      author: post?.author || 'Админ',
      publishDate: post?.publishDate || new Date().toISOString(),
      categorySlug: post?.categorySlug || '',
      customUrl: post?.customUrl || '',
      keywords: post?.keywords || '',
      status: post?.status || 'draft',
      readTime: post?.readTime || 5,
      content: post?.content || '',
      images: post?.images?.join(', ') || '',
    }
  });

  // Автоматическая генерация customUrl из title
  useEffect(() => {
    if (!post?.id) {
      const title = watch('title');
      if (title) {
        const slug = title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        setValue('customUrl', slug);
      }
    }
  }, [watch('title'), post?.id, setValue]);

  const onSubmit = async (data: any) => {
    try {
      // Преобразуем images из строки в массив
      const imagesArray = data.images
        ? data.images.split(',').map((url: string) => url.trim()).filter(Boolean)
        : [];

      if (post?.id) {
        // Обновление
        const updateData: UpdateBlogPostDto & { id: string } = {
          id: post.id,
          title: data.title,
          excerpt: data.excerpt,
          author: data.author,
          publishDate: data.publishDate,
          categorySlug: data.categorySlug,
          customUrl: data.customUrl,
          keywords: data.keywords || undefined,
          status: data.status,
          readTime: parseInt(data.readTime) || undefined,
          content: data.content || undefined,
          images: imagesArray.length > 0 ? imagesArray : undefined,
        };

        await updatePost(updateData).unwrap();
        toast({
          title: "Статья обновлена",
          description: "Изменения успешно сохранены",
        });
      } else {
        // Создание
        const createData: CreateBlogPostDto = {
          title: data.title,
          excerpt: data.excerpt,
          author: data.author,
          publishDate: data.publishDate,
          categorySlug: data.categorySlug,
          customUrl: data.customUrl,
          keywords: data.keywords || undefined,
          status: data.status,
          readTime: parseInt(data.readTime) || undefined,
          content: data.content || undefined,
          images: imagesArray.length > 0 ? imagesArray : undefined,
        };

        await createPost(createData).unwrap();
        toast({
          title: "Статья создана",
          description: "Статья успешно добавлена в блог",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.data?.message || error?.message || "Не удалось сохранить статью",
        variant: "destructive",
      });
    }
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
            <Label htmlFor="title">Заголовок статьи *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Заголовок обязателен' })}
              placeholder="Введите заголовок статьи"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="excerpt">Краткое описание *</Label>
            <Textarea
              id="excerpt"
              {...register('excerpt', { required: 'Краткое описание обязательно' })}
              placeholder="Краткое описание статьи для превью"
              rows={3}
            />
            {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="author">Автор *</Label>
              <Input
                id="author"
                {...register('author', { required: 'Автор обязателен' })}
                placeholder="Имя автора"
              />
              {errors.author && <p className="text-red-500 text-sm mt-1">{errors.author.message}</p>}
            </div>

            <div>
              <Label htmlFor="publishDate">Дата публикации *</Label>
              <Input
                id="publishDate"
                type="datetime-local"
                {...register('publishDate', { required: 'Дата обязательна' })}
              />
              {errors.publishDate && <p className="text-red-500 text-sm mt-1">{errors.publishDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categorySlug">Категория *</Label>
              <Select
                value={watch('categorySlug')}
                onValueChange={(value) => setValue('categorySlug', value)}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Загрузка..." : "Выберите категорию"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.slug} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!watch('categorySlug') && <p className="text-red-500 text-sm mt-1">Выберите категорию</p>}
            </div>

            <div>
              <Label htmlFor="customUrl">URL статьи (slug) *</Label>
              <Input
                id="customUrl"
                {...register('customUrl', {
                  required: 'URL обязателен',
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: 'Только строчные буквы, цифры и дефисы'
                  }
                })}
                placeholder="my-article-url"
              />
              {errors.customUrl && <p className="text-red-500 text-sm mt-1">{errors.customUrl.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="readTime">Время чтения (минуты)</Label>
              <Input
                id="readTime"
                type="number"
                {...register('readTime')}
                placeholder="5"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="status">Статус</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as 'draft' | 'published')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Черновик</SelectItem>
                  <SelectItem value="published">Опубликовано</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Контент */}
      <Card>
        <CardHeader>
          <CardTitle>Содержание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content">Текст статьи</Label>
            <Textarea
              id="content"
              {...register('content')}
              placeholder="Основной текст статьи (поддерживается Markdown)"
              rows={12}
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Используйте Markdown для форматирования: **жирный**, *курсив*, # Заголовок
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEO и медиа */}
      <Card>
        <CardHeader>
          <CardTitle>SEO и медиа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="keywords">Ключевые слова (через запятую)</Label>
            <Input
              id="keywords"
              {...register('keywords')}
              placeholder="seo, блог, статья"
            />
          </div>

          <div>
            <Label htmlFor="images">Изображения (URLs через запятую)</Label>
            <Textarea
              id="images"
              {...register('images')}
              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              Введите URLs изображений, разделённые запятыми. Максимум 4 изображения.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Кнопки */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={isCreating || isUpdating}>
          {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {post?.id ? 'Сохранить изменения' : 'Создать статью'}
        </Button>
      </div>
    </form>
  );
}
