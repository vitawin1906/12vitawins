import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Star,
  User,
  Calendar,
  CheckCircle,
  Loader2,
  MessageSquare,
  Edit,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetPublicReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from '@/store/api/domains';
import { useAuthStore } from '@/stores/authStore';
import type { Review, CreateReviewDto } from '@/types/review';
import { calculateAverageRating, getRatingColor } from '@/utils/review/normalize';

interface ProductReviewsProps {
  productId: string;
  productName?: string;
}

/**
 * ProductReviews - Компонент отзывов на товар
 *
 * Отображает:
 * - Средний рейтинг и количество отзывов
 * - Список опубликованных отзывов
 * - Форму для добавления отзыва (для авторизованных)
 * - Редактирование/удаление собственных отзывов
 */
const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { toast } = useToast();
  const user = useAuthStore(state => state.user);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // RTK Query hooks
  const { data: reviews = [], isLoading } = useGetPublicReviewsQuery({ productId, status: 'published' });
  const [createReview, { isLoading: isCreating }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isUpdating }] = useUpdateReviewMutation();
  const [deleteReview, { isLoading: isDeleting }] = useDeleteReviewMutation();

  // Form state
  const [formData, setFormData] = useState<CreateReviewDto>({
    productId,
    rating: 5,
    title: '',
    body: '',
  });

  // Статистика
  const averageRating = calculateAverageRating(reviews);
  const totalReviews = reviews.length;

  // Мой отзыв (если есть)
  const myReview = reviews.find(r => r.userId === user?.id);
  const canWriteReview = user && !myReview;

  // Открыть диалог создания
  const handleOpenCreate = () => {
    setEditingReview(null);
    setFormData({
      productId,
      rating: 5,
      title: '',
      body: '',
    });
    setIsDialogOpen(true);
  };

  // Открыть диалог редактирования
  const handleOpenEdit = (review: Review) => {
    setEditingReview(review);
    setFormData({
      productId,
      rating: review.rating,
      title: review.title || '',
      body: review.body || '',
    });
    setIsDialogOpen(true);
  };

  // Создать/обновить отзыв
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите, чтобы оставить отзыв',
        variant: 'destructive',
      });
      return;
    }

    if (formData.rating < 1 || formData.rating > 5) {
      toast({
        title: 'Некорректный рейтинг',
        description: 'Рейтинг должен быть от 1 до 5',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingReview) {
        // Обновление
        await updateReview({
          id: editingReview.id,
          ...formData,
        }).unwrap();

        toast({
          title: 'Отзыв обновлён',
          description: 'Ваши изменения отправлены на модерацию',
        });
      } else {
        // Создание
        await createReview(formData).unwrap();

        toast({
          title: 'Отзыв отправлен',
          description: 'Спасибо! Отзыв появится после проверки модератором',
        });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось сохранить отзыв',
        variant: 'destructive',
      });
    }
  };

  // Удалить отзыв
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить отзыв?')) {
      return;
    }

    try {
      await deleteReview(id).unwrap();
      toast({
        title: 'Отзыв удалён',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось удалить отзыв',
        variant: 'destructive',
      });
    }
  };

  // Звёзды рейтинга
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  // Селектор звёзд для формы
  const renderStarSelector = () => {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, rating: star })}
            className="transition hover:scale-110"
          >
            <Star
              className={`h-8 w-8 cursor-pointer ${
                star <= formData.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-200 text-gray-200 hover:fill-yellow-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Отзывы покупателей
              </CardTitle>
              {totalReviews > 0 && (
                <div className="flex items-center gap-3 mt-3">
                  {renderStars(averageRating, 'lg')}
                  <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({totalReviews} отзывов)</span>
                </div>
              )}
            </div>

            {canWriteReview && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenCreate}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Написать отзыв
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReview ? 'Редактировать отзыв' : 'Новый отзыв'}
                    </DialogTitle>
                    <DialogDescription>
                      Поделитесь мнением о товаре {productName}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Рейтинг */}
                    <div>
                      <Label>Рейтинг *</Label>
                      <div className="mt-2">{renderStarSelector()}</div>
                    </div>

                    {/* Заголовок */}
                    <div>
                      <Label htmlFor="title">Заголовок</Label>
                      <Input
                        id="title"
                        placeholder="Коротко о вашем впечатлении"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        maxLength={100}
                      />
                    </div>

                    {/* Текст отзыва */}
                    <div>
                      <Label htmlFor="body">Отзыв</Label>
                      <Textarea
                        id="body"
                        placeholder="Расскажите подробнее о товаре"
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        rows={5}
                        maxLength={2000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.body?.length || 0} / 2000 символов
                      </p>
                    </div>

                    {/* Кнопки */}
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={isCreating || isUpdating} className="flex-1">
                        {(isCreating || isUpdating) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingReview ? 'Сохранить' : 'Отправить'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {myReview && myReview.status === 'pending' && (
              <Badge variant="outline" className="text-yellow-600">
                Ваш отзыв на модерации
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Список отзывов */}
      {totalReviews === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">Пока нет отзывов</p>
            <p className="text-sm text-muted-foreground mb-4">
              Станьте первым, кто оставит отзыв об этом товаре
            </p>
            {canWriteReview && (
              <Button onClick={handleOpenCreate}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Написать отзыв
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isMyReview = review.userId === user?.id;
            const reviewDate = new Date(review.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Заголовок отзыва */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {review.userName || 'Покупатель'}
                            </span>
                          </div>
                          {review.verifiedPurchase && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Проверенная покупка
                            </Badge>
                          )}
                          {isMyReview && (
                            <Badge variant="outline">Ваш отзыв</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {renderStars(review.rating)}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {reviewDate}
                          </div>
                        </div>
                      </div>

                      {/* Кнопки редактирования/удаления для собственных отзывов */}
                      {isMyReview && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(review)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(review.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Заголовок отзыва */}
                    {review.title && (
                      <h4 className="font-semibold text-lg">{review.title}</h4>
                    )}

                    {/* Текст отзыва */}
                    {review.body && (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {review.body}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
