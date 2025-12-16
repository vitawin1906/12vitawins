import cors from 'cors';

export function buildCors() {
  const envOrigins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean);
  const isDev = process.env.NODE_ENV !== 'production';

  // Разрешаем localhost только в режиме разработки
  const defaultOrigins = isDev ? [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000',
  ] : [];

  const allowedOrigins = envOrigins || defaultOrigins;

  console.log('🔐 CORS enabled for origins:', allowedOrigins);

  // В production требуем явного указания CORS_ORIGIN
  if (!isDev && allowedOrigins.length === 0) {
    console.warn('⚠️ WARNING: CORS_ORIGIN not set in production! No origins will be allowed.');
  }

  return cors({
    origin: (origin, callback) => {
      // Webhook endpoints (без Origin header)
      if (!origin) {
        return callback(null, true);
      }

      // Проверяем список разрешенных origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Проверяем wildcard subdomains (например, *.vitawins.ru)
      const wildcardMatch = allowedOrigins.some(allowed => {
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2); // убираем '*.'
          return origin.endsWith(domain);
        }
        return false;
      });

      if (wildcardMatch) {
        return callback(null, true);
      }

      // В dev режиме - разрешаем, но логируем
      if (isDev) {
        console.warn(`⚠️ CORS: Origin "${origin}" not in whitelist (dev mode - allowing)`);
        return callback(null, true);
      }

      // В production - блокируем и логируем
      console.warn(`🚫 CORS: Blocked origin "${origin}"`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours - кэшируем preflight запросы
  });
}

export default buildCors;
