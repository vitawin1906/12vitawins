/**
 * Утилиты для форматирования дат в единообразном стиле по всему приложению
 */

export type DateLike = string | Date | null | undefined;

/**
 * Форматирует дату в русский формат: "1 января 2025"
 * Возвращает fallback если дата невалидна
 */
export function formatDateRu(date: DateLike, fallback = '—'): string {
  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;

    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return fallback;
  }
}

/**
 * Форматирует дату в короткий русский формат: "01.01.2025"
 * Возвращает fallback если дата невалидна
 */
export function formatDateShortRu(date: DateLike, fallback = '—'): string {
  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;

    return d.toLocaleDateString('ru-RU');
  } catch {
    return fallback;
  }
}

/**
 * Форматирует дату и время в русский формат: "1 января 2025, 14:30"
 * Возвращает fallback если дата невалидна
 */
export function formatDateTimeRu(date: DateLike, fallback = '—'): string {
  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;

    return d.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}

/**
 * Форматирует относительную дату: "3 дня назад", "вчера", "сегодня"
 * Возвращает fallback если дата невалидна
 */
export function formatDateRelative(date: DateLike, fallback = '—'): string {
  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дней назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} месяцев назад`;

    return `${Math.floor(diffDays / 365)} лет назад`;
  } catch {
    return fallback;
  }
}

/**
 * Проверяет валидность даты
 */
export function isValidDate(date: DateLike): boolean {
  if (!date) return false;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}

/**
 * Парсит дату из строки безопасно
 * Возвращает null если дата невалидна
 */
export function parseDateSafe(date: string | null | undefined): Date | null {
  if (!date) return null;

  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
