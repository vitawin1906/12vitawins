/**
 * Утилиты для валидации URL и предотвращения внешних ссылок
 */

const ALLOWED_DOMAINS = [
  'vitawin.site',
  'vitawins.ru',
  'localhost',
  '127.0.0.1'
];

/**
 * Проверяет, является ли URL внутренним (разрешенным)
 */
export function isInternalUrl(url: string): boolean {
  if (!url || url === '#') return true;
  
  // Относительные пути всегда разрешены
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }
  
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
  } catch {
    // Если URL невалидный, считаем его относительным
    return true;
  }
}

/**
 * Валидирует URL и возвращает ошибку если он внешний
 */
export function validateUrl(url: string): string | null {
  if (!url || url === '#') return null;
  
  if (!isInternalUrl(url)) {
    return 'Внешние ссылки не разрешены. Используйте только внутренние ссылки сайта.';
  }
  
  return null;
}

/**
 * Фильтрует URL, заменяя внешние ссылки на безопасные
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  if (isInternalUrl(url)) {
    return url;
  }
  
  return '#';
}

/**
 * Валидирует изображение URL
 */
export function validateImageUrl(url: string): string | null {
  if (!url) return null;
  
  // Блокируем все внешние изображения
  if (url.startsWith('http')) {
    return 'Внешние изображения не разрешены. Загрузите изображение на сервер.';
  }
  
  return null;
}