/**
 * Review normalization utilities
 */

import type { Review, ReviewImage, ReviewStatus } from '@/types/review';

const DEBUG = import.meta.env.DEV;

function log(label: string, data: any) {
  if (DEBUG) {
    console.log(`[Review Normalize] ${label}:`, data);
  }
}

/* ======================== Review Normalization ======================== */

/**
 * Нормализует Review с backend
 */
export function normalizeReviewFromApi(raw: any): Review {
  if (!raw) {
    throw new Error('normalizeReviewFromApi: raw data is null/undefined');
  }

  log('RAW Review from backend', raw);

  const normalized: Review = {
    id: String(raw.id),
    productId: String(raw.productId),
    userId: String(raw.userId),
    rating: Number(raw.rating) || 1,
    title: raw.title || null,
    body: raw.body || null,
    status: (raw.status || 'pending') as ReviewStatus,
    verifiedPurchase: Boolean(raw.verifiedPurchase),
    publishedAt: raw.publishedAt || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),

    // JOIN поля (если есть)
    userName: raw.userName || undefined,
    productName: raw.productName || undefined,
    images: Array.isArray(raw.images) ? raw.images : undefined,
  };

  log('NORMALIZED Review for frontend', normalized);

  return normalized;
}

/**
 * Нормализует массив отзывов
 */
export function normalizeReviewsFromApi(rawArray: any[]): Review[] {
  if (!Array.isArray(rawArray)) {
    console.warn('[normalizeReviews] Expected array, got:', typeof rawArray);
    return [];
  }

  return rawArray
    .map((raw, index) => {
      try {
        return normalizeReviewFromApi(raw);
      } catch (error) {
        console.error(`[normalizeReviews] Error at index ${index}:`, error, raw);
        return null;
      }
    })
    .filter((review): review is Review => review !== null);
}

/* ======================== Formatting Utilities ======================== */

/**
 * Получает цвет для рейтинга
 */
export function getRatingColor(rating: number): 'red' | 'yellow' | 'green' {
  if (rating <= 2) return 'red';
  if (rating <= 3) return 'yellow';
  return 'green';
}

/**
 * Получает текст для рейтинга
 */
export function getRatingText(rating: number): string {
  if (rating === 5) return 'Отлично';
  if (rating === 4) return 'Хорошо';
  if (rating === 3) return 'Нормально';
  if (rating === 2) return 'Плохо';
  return 'Ужасно';
}

/**
 * Получает название статуса
 */
export function getStatusName(status: ReviewStatus): string {
  const names: Record<ReviewStatus, string> = {
    pending: 'На модерации',
    published: 'Опубликован',
    rejected: 'Отклонён',
  };
  return names[status] || status;
}

/**
 * Получает цвет для статуса
 */
export function getStatusColor(status: ReviewStatus): 'yellow' | 'green' | 'red' {
  const colors: Record<ReviewStatus, 'yellow' | 'green' | 'red'> = {
    pending: 'yellow',
    published: 'green',
    rejected: 'red',
  };
  return colors[status] || 'yellow';
}

/**
 * Валидация отзыва
 */
export function validateReview(review: Partial<Review>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!review.rating || review.rating < 1 || review.rating > 5) {
    errors.rating = 'Выберите оценку от 1 до 5';
  }

  if (review.title && review.title.length > 200) {
    errors.title = 'Заголовок не может быть длиннее 200 символов';
  }

  if (review.body && review.body.length < 10) {
    errors.body = 'Отзыв должен содержать минимум 10 символов';
  }

  if (review.body && review.body.length > 5000) {
    errors.body = 'Отзыв не может быть длиннее 5000 символов';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Форматирует дату отзыва
 */
export function formatReviewDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дней назад`;
    if (days < 30) return `${Math.floor(days / 7)} недель назад`;
    if (days < 365) return `${Math.floor(days / 30)} месяцев назад`;
    return `${Math.floor(days / 365)} лет назад`;
  } catch {
    return dateStr;
  }
}

/**
 * Вычисляет средний рейтинг из массива отзывов
 */
export function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Number((sum / reviews.length).toFixed(1));
}

/**
 * Группирует отзывы по рейтингу (для статистики)
 */
export function groupReviewsByRating(reviews: Review[]): Record<number, number> {
  const groups: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      groups[review.rating]++;
    }
  });

  return groups;
}
