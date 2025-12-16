import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  MessageSquare,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAdminReviewsQuery,
  useAdminApproveReviewMutation,
  useAdminRejectReviewMutation,
} from '@/store/api/domains';
import type {  ReviewStatus } from '@/types/review';

/**
 * ReviewsManagement - Админ-панель управления отзывами
 *
 * Функционал:
 * - Просмотр всех отзывов (опубликованных, на модерации, отклонённых)
 * - Фильтрация по статусу, рейтингу, товару
 * - Утверждение/отклонение отзывов
 */
const ReviewsManagement = () => {
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // RTK Query hooks
  const { data: reviews = [], isLoading } = useGetAdminReviewsQuery();
  const [approveReview, { isLoading: isApproving }] = useAdminApproveReviewMutation();
  const [rejectReview, { isLoading: isRejecting }] = useAdminRejectReviewMutation();

  // Фильтрация отзывов
  const filteredReviews = reviews.filter((review) => {
    if (statusFilter !== 'all' && review.status !== statusFilter) return false;
    if (ratingFilter !== 'all' && review.rating !== ratingFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        review.productName?.toLowerCase().includes(query) ||
        review.userName?.toLowerCase().includes(query) ||
        review.title?.toLowerCase().includes(query) ||
        review.body?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Статистика
  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    published: reviews.filter((r) => r.status === 'published').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  // Утвердить отзыв
  const handleApprove = async (id: string) => {
    try {
      await approveReview(id).unwrap();
      toast({
        title: 'Отзыв одобрен',
        description: 'Отзыв опубликован',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось одобрить отзыв',
        variant: 'destructive',
      });
    }
  };

  // Отклонить отзыв
  const handleReject = async (id: string) => {
    if (!confirm('Вы уверены, что хотите отклонить этот отзыв?')) {
      return;
    }

    try {
      await rejectReview(id).unwrap();
      toast({
        title: 'Отзыв отклонён',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error?.data?.message || 'Не удалось отклонить отзыв',
        variant: 'destructive',
      });
    }
  };

  // Звёзды рейтинга
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  // Badge для статуса
  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            На модерации
          </Badge>
        );
      case 'published':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Опубликован
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Отклонён
          </Badge>
        );
    }
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Управление отзывами
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Всего</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">На модерации</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Опубликовано</p>
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Отклонено</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по товару, автору, тексту..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Фильтр по статусу */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ReviewStatus | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">На модерации</SelectItem>
                <SelectItem value="published">Опубликованные</SelectItem>
                <SelectItem value="rejected">Отклонённые</SelectItem>
              </SelectContent>
            </Select>

            {/* Фильтр по рейтингу */}
            <Select
              value={String(ratingFilter)}
              onValueChange={(value) => setRatingFilter(value === 'all' ? 'all' : Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Рейтинг" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все рейтинги</SelectItem>
                <SelectItem value="5">5 звёзд</SelectItem>
                <SelectItem value="4">4 звезды</SelectItem>
                <SelectItem value="3">3 звезды</SelectItem>
                <SelectItem value="2">2 звезды</SelectItem>
                <SelectItem value="1">1 звезда</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список отзывов */}
      {filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">Отзывы не найдены</p>
            <p className="text-sm text-muted-foreground">
              Попробуйте изменить фильтры
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const reviewDate = new Date(review.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Заголовок */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(review.status)}
                          {review.verifiedPurchase && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Проверенная покупка
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {review.userName || 'Аноним'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {reviewDate}
                          </div>
                        </div>

                        {review.productName && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Товар: <span className="font-medium">{review.productName}</span>
                          </p>
                        )}

                        {renderStars(review.rating)}
                      </div>

                      {/* Кнопки действий */}
                      {review.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleApprove(review.id)}
                            disabled={isApproving}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(review.id)}
                            disabled={isRejecting}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Отклонить
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
                      <p className="text-muted-foreground whitespace-pre-wrap border-l-4 border-gray-200 pl-4">
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

export default ReviewsManagement;
