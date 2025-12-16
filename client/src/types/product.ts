/**
 * Product types
 *
 * ⚠️ DEPRECATED: Используйте типы из @/store/api/domains/productsApi
 *
 * Этот файл сохранен для обратной совместимости и будет удален в будущем.
 * Все новые компоненты должны использовать:
 * - import { Product } from '@/store/api/domains/productsApi'
 * - import { ProductImageMetadata } from '@/store/api/domains/productsApi' (если нужно)
 */

// Re-export актуальных типов для обратной совместимости
export type { Product, Product as UiProduct } from '@/store/api/domains/productsApi';

/**
 * Метаданные изображения для создания/редактирования продукта
 * @deprecated Используйте Product['images'][number] из productsApi
 */
export type ProductImageMetadata = {
    mediaId: string;              // Cloudinary public_id или URL
    url?: string;                 // Cloudinary secure_url (опционально)

    format?: string | null;
    width?: number | null;
    height?: number | null;
    bytes?: number | null;

    role: 'main' | 'gallery';
    sortOrder: number;
    alt?: string | null;
};

/**
 * @deprecated Legacy типы - не используйте в новом коде
 */

export interface ApiProductImage {
  id: string;
  product_id: string;
  url: string | null;
  webp_url: string | null;
  thumbnail_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  position: number;
  created_at: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface ApiProduct {
  id: string;
  title: string | null;
  h1: string | null;
  seo_title: string | null;
  seo_description: string | null;
  price: string;
  original_price: string | null;
  custom_pv: string | null;
  custom_cashback: string | null;
  pv_auto: string | null;
  cashback_auto: string | null;
  slug: string | null;
  category_id: string;
  description: string | null;
  long_description: string | null;
  in_stock: boolean | null;
  status: 'active' | 'inactive' | string;
  is_pv_eligible: boolean | null;
  created_at: string;
  updated_at: string;
  images: ApiProductImage[];
  categories: ApiCategory[];
  rating?: number | null;
  reviews?: number | null;
  badge?: string | null;
}

export interface ApiProductsResponse {
  success: boolean;
  products: ApiProduct[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
  }
}

