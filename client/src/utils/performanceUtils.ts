/**
 * Утилиты для оптимизации производительности сайта
 */

// Дебаунсинг для поисковых запросов
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Троттлинг для скролла
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Предзагрузка критических ресурсов
export function preloadCriticalResources() {
  const criticalImages = [
    '/placeholder.svg'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}

// Оптимизация изображений
export function optimizeImage(url: string, quality: number = 80): string {
  // Для будущей интеграции с сервисом оптимизации изображений
  return url;
}

// Метрики производительности
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(name: string): void {
    this.metrics.set(name, performance.now());
  }

  endTiming(name: string): number {
    const start = this.metrics.get(name);
    if (start) {
      const duration = performance.now() - start;
      return duration;
    }
    return 0;
  }

  measurePageLoad(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
    });
  }

  measureLargestContentfulPaint(): void {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  measureFirstInputDelay(): void {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
      });
    }).observe({ entryTypes: ['first-input'] });
  }

  measureCumulativeLayoutShift(): void {
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  initializeMonitoring(): void {
    this.measurePageLoad();
    this.measureLargestContentfulPaint();
    this.measureFirstInputDelay();
    this.measureCumulativeLayoutShift();
  }
}

// Виртуализация для больших списков
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleItems: number;
  private scrollTop: number = 0;

  constructor(container: HTMLElement, itemHeight: number) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
  }

  getVisibleRange(totalItems: number): { start: number; end: number } {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + this.visibleItems, totalItems);
    return { start: Math.max(0, start), end };
  }

  updateScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }
}

// Кэширование API запросов
export class APICache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  static clear(): void {
    this.cache.clear();
  }

  static clearProducts(): void {
    // Очищаем кеш товаров
    for (const [key] of this.cache.entries()) {
      if (key.includes('/api/products')) {
        this.cache.delete(key);
      }
    }
  }
}