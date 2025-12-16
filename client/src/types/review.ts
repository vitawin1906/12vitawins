// client/src/types/review.ts

/**
 * Review Types
 * Соответствуют backend/src/db/schema/reviews.ts
 */

/* ======================== Enums ======================== */

export type ReviewStatus = 'pending' | 'published' | 'rejected';

/* ======================== Interfaces ======================== */

/**
 * ReviewImage - Изображение прикреплённое к отзыву
 */
export interface ReviewImage {
  reviewId: string;
  position: number; // 1..6
  url: string; // Cloudinary URL
}

/**
 * Review - Отзыв на товар
 *
 * Особенности:
 * - Один пользователь может оставить только один отзыв на товар (UNIQUE(productId, userId))
 * - rating: 1..5 звёзд
 * - status: pending (модерация) → published (опубликован) или rejected (отклонён)
 * - verifiedPurchase: true если пользователь действительно купил товар
 */
export interface Review {
  id: string; // UUID
  productId: string; // UUID FK → product.id
  userId: string; // UUID FK → app_user.id
  rating: number; // 1..5
  title?: string | null; // Заголовок отзыва
  body?: string | null; // Текст отзыва
  status: ReviewStatus; // 'pending' | 'published' | 'rejected'
  verifiedPurchase: boolean; // Подтверждённая покупка
  publishedAt?: string | null; // Дата публикации
  createdAt: string;
  updatedAt: string;

  // Дополнительные поля (JOIN на фронтенде)
  userName?: string; // Имя пользователя (из appUser)
  productName?: string; // Название товара (из product)
  images?: ReviewImage[]; // Прикреплённые изображения
}

/* ======================== DTO Types ======================== */

/**
 * CreateReviewDto - данные для создания отзыва
 */
export interface CreateReviewDto {
  productId: string;
  rating: number; // 1..5
  title?: string;
  body?: string;
  images?: string[]; // URLs изображений (до 6 штук)
}

/**
 * UpdateReviewDto - данные для обновления отзыва
 */
export interface UpdateReviewDto {
  rating?: number; // 1..5
  title?: string;
  body?: string;
  images?: string[]; // URLs изображений
}

/**
 * AdminReviewUpdateDto - админские действия над отзывом
 */
export interface AdminReviewUpdateDto {
  status?: ReviewStatus;
  verifiedPurchase?: boolean;
}

/* ======================== Response Types ======================== */

export interface ReviewsResponse {
  success: boolean;
  reviews: Review[];
  total?: number;
}

export interface ReviewResponse {
  success: boolean;
  review: Review;
}

/* ======================== Query Params ======================== */

export interface ReviewsQuery {
  productId?: string;
  userId?: string;
  status?: ReviewStatus;
  limit?: number;
  offset?: number;
}
