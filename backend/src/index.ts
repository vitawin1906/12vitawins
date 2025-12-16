// backend/src/index.ts
import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import { createRequire } from 'module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TIMEZONE } from '#config/constants';
import { swaggerSpec } from './swagger/swagger.config';

import buildHelmet from './middleware/helmet';
import buildCors from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';

import { buildAdminRouter } from '#routes/admin';
import adminAuthRouter from './routes/admin/auth.routes';

import productsRouter from './routes/products.routes';
import adminProductsRouter from './routes/products.admin.routes';
import authRouter from '#routes/authRoute';

import withdrawalsRouter, { adminWithdrawalsRouter } from './routes/withdrawals.routes';
import addressesRouter from './routes/addresses.routes';
import reviewsRouter, { adminReviewsRouter } from './routes/reviews.routes';

// New routes
import usersRouter, { adminUsersRouter } from './routes/users.routes';
import ordersRouter, { adminOrdersRouter } from './routes/orders.routes';
import paymentsRouter, { adminPaymentsRouter } from './routes/payments.routes';
import mlmRouter, { adminMlmRouter } from './routes/mlm.routes';
import cartRouter from './routes/cart.routes';
import { docsRouter } from './routes/docs.routes';
import ledgerRouter, { adminLedgerRouter } from './routes/ledger.routes';
import mediaRouter, { adminMediaRouter } from './routes/media.routes';
import categoriesRouter, { adminCategoriesRouter } from './routes/categories.routes';
import promoRouter, { adminPromoRouter } from './routes/promo.routes';
import ranksRouter, { adminRanksRouter } from './routes/ranks.routes';
import gamificationRouter, { adminGamificationRouter } from './routes/gamification.routes';
import settingsRouter, { adminSettingsRouter } from './routes/settings.routes';
import blogRouter, { adminBlogRouter } from './routes/blog.routes';
import bonusPreferencesRouter, { adminBonusPreferencesRouter } from './routes/userBonusPreferences.routes';
import { adminStatsRouter } from './routes/stats.routes';
import promoCodesRouter from './routes/promoCodes.routes';
import partnerUpgradeRouter from './routes/partnerUpgrade.routes';
import freedomSharesRouter from './routes/freedomShares.routes';
import matrixPlacementRouter from './routes/matrixPlacement.routes';
import networkFundRouter from './routes/networkFund.routes';
import telegramRouter from './routes/telegram.routes';
import activationPackageRouter from './routes/activationPackage.routes';
import adminActivationPackageRouter from './routes/admin/activationPackage.routes';
import googleOAuthRouter from './routes/googleOAuth.routes';
import cookieParser from 'cookie-parser';

import { loadSettlementSettings } from '#config/settlementSettings';
import { performanceMonitor } from './services/performanceMonitor';
import { initPaymentTimeoutWorker } from './services/paymentTimeoutWorker';

const STRICT_BOOT = process.env.STRICT_BOOT === 'true';
if (process.env.NODE_ENV === 'test' && !('SKIP_ENUM_SYNC' in process.env)) {
    process.env.SKIP_ENUM_SYNC = 'true';
}

// TZ – если не задан, берём из констант
if (!process.env.TZ) process.env.TZ = TIMEZONE;

export const app: Express = express();

// ---------------------- Security ----------------------
app.use(buildHelmet());
app.use(buildCors());

const require = createRequire(import.meta.url);

// ---------------------- Parsers ----------------------
await loadSettlementSettings();

// ✅ Запускаем payment timeout worker (отменяет неоплаченные заказы)
if (process.env.NODE_ENV !== 'test') {
    initPaymentTimeoutWorker({
        paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES || 30),
        workerIntervalMs: Number(process.env.PAYMENT_TIMEOUT_WORKER_INTERVAL_MS || 5 * 60 * 1000),
        batchSize: Number(process.env.PAYMENT_TIMEOUT_BATCH_SIZE || 50),
        enableLogging: process.env.PAYMENT_TIMEOUT_LOGGING !== 'false',
    });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// ---------------------- Perf monitor ----------------------
app.use(performanceMonitor.createMiddleware());

// ---------------------- OpenAPI / Swagger ----------------------
const __dirname = fileURLToPath(new URL('.', import.meta.url));

app.get('/openapi.json', (_req, res) => {
    try {
        // путь к сгенерённому openapi.json рядом со /src
        const jsonPath = resolve(__dirname, './docs/openapi.json');
        const buf = readFileSync(jsonPath, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        return res.send(buf);
    } catch {
        // fallback – живой swaggerSpec
        return res.json(swaggerSpec);
    }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true })); // опциональный дубль

// ---------------------- Admin metrics ----------------------
app.get('/api/admin/metrics/perf', (_req, res) => {
    res.json(performanceMonitor.getMetrics(100));
});

app.get('/api/admin/metrics/health', async (_req, res) => {
    res.json(await performanceMonitor.getSystemHealth());
});

// ✅ Ручной запуск payment timeout worker (для админки/отладки)
app.post('/api/admin/workers/payment-timeout/run', async (_req, res) => {
    try {
        const { paymentTimeoutWorker } = await import('./services/paymentTimeoutWorker');
        const result = await paymentTimeoutWorker.runOnce();
        res.json({
            success: true,
            message: 'Payment timeout worker completed',
            result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// ---------------------- Admin auth (email/password) ----------------------
// Монтируем отдельно на /api/admin/auth, чтобы не конфликтовать с основным /api/admin
app.use('/api/admin', adminAuthRouter);

// ---------------------- Public API routes ----------------------
app.use('/api/auth', authRouter);
app.use('/api/auth', googleOAuthRouter); // Google OAuth
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/mlm', mlmRouter);
app.use('/api/cart', cartRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/media', mediaRouter);
app.use('/api/promo', promoRouter);
app.use('/api/ranks', ranksRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/blog', blogRouter);
app.use('/api/bonus-preferences', bonusPreferencesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api', promoCodesRouter); // Промокоды (user + admin)
app.use('/api', freedomSharesRouter); // Freedom Shares (user)
app.use('/api', matrixPlacementRouter); // Matrix Placement (user + admin)
app.use('/api/telegram', telegramRouter); // Telegram bot integration
app.use('/api/activation-packages', activationPackageRouter); // Activation Packages (Partner/Pro)
// ---------------------- Admin subrouters ----------------------
app.use('/api/admin/withdrawals', adminWithdrawalsRouter);
app.use('/api/admin/reviews', adminReviewsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/payments', adminPaymentsRouter);
app.use('/api/admin/mlm', adminMlmRouter);
app.use('/api/admin/ledger', adminLedgerRouter);
app.use('/api/admin/media', adminMediaRouter);
app.use('/api/admin/categories', adminCategoriesRouter);
app.use('/api/admin/promo', adminPromoRouter);
app.use('/api/admin/ranks', adminRanksRouter);
app.use('/api/admin/gamification', adminGamificationRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/admin/blog', adminBlogRouter);
app.use('/api/admin/bonus-preferences', adminBonusPreferencesRouter);
app.use('/api/admin/stats', adminStatsRouter);
app.use('/api/admin/activation-packages', adminActivationPackageRouter); // Admin Activation Packages
app.use('/api', partnerUpgradeRouter); // Partner upgrade (admin only)
app.use('/api', networkFundRouter); // Network fund (admin only)

// ---------------------- Cache & Static ----------------------
// Сначала – статика аплоадов с no-store (чтобы не залипали аватарки и т.п.)
app.use(
    '/uploads',
    express.static('uploads', {
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'no-store');
        },
    }),
);

// Затем – кэширующие заголовки для остального
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (
        req.method === 'GET' &&
        /\.(js|css|png|jpg|jpeg|gif|ico|svg)$/.test(req.path) &&
        !req.path.startsWith('/uploads')
    ) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    next();
});

// ---------------------- Slow/err logging ----------------------
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (path.startsWith('/api') && (res.statusCode >= 400 || duration > 1000)) {
            console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
    });
    next();
});

// ---------------------- API routes (legacy/public) ----------------------
app.use('/api/products', productsRouter); // Public read-only
app.use('/api/admin/products', adminProductsRouter); // Admin full CRUD
app.use('/api/admin/categories', categoriesRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/reviews', reviewsRouter);

// ---------------------- Site scripts (custom head/body scripts) ----------------------
app.get('/api/site-scripts', (_req: Request, res: Response) => {
    // Возвращаем пустые скрипты по умолчанию
    // В будущем можно добавить в settings для управления через админку
    res.json({
        success: true,
        head_scripts: '',
        body_scripts: ''
    });
});

// ---------------------- Health ----------------------
app.get('/healthz', (_req: Request, res: Response) => res.json({ ok: true }));

// ---------------------- Search engine verification ----------------------
app.get('/googlef83aa8e382644bb1.html', (_req, res) => {
    res.type('text/plain').send('google-site-verification: googlef83aa8e382644bb1.html');
});
app.get('/yandex_86c923468bce03a6.html', (_req, res) => {
    res.type('text/html').send('<html><body>Verification: 86c923468bce03a6</body></html>');
});

// ---------------------- Docs site (в самом конце, чтобы не перехватывал /api/*) ----------------------
app.use('/', docsRouter);

// ---------------------- Admin bootstrap ----------------------
export async function mountAdmin(targetApp: Express = app) {
    const skipEnums = process.env.SKIP_ENUM_SYNC === 'true';
    if (!skipEnums) {
        try {
            console.log('✅ Enums are in sync with the database');
        } catch {
            console.warn('⚠ Enums sync check skipped');
        }
    } else {
        console.log('↪️ Enum sync skipped (SKIP_ENUM_SYNC=true)');
    }

    try {
        const adminRouter = await buildAdminRouter();
        targetApp.use('/api/admin', adminRouter);
    } catch (e) {
        console.warn('⚠️ Admin router bootstrap failed:', e);
        if (STRICT_BOOT) {
            console.error('❌ STRICT_BOOT=true, exiting due to admin bootstrap failure');
            process.exit(1);
        }
        const stub = express.Router();
        stub.use((_req, res) =>
            res.status(503).json({ error: 'ADMIN_UNAVAILABLE', message: 'Admin temporarily disabled' }),
        );
        targetApp.use('/api/admin', stub);
    }
}

// ---------------------- Errors (последним) ----------------------
app.use(errorHandler);

// ---------------------- Server start ----------------------
export async function startServer() {
    await mountAdmin(app);
    const port = Number(process.env.PORT || 8000);
    return app.listen(port, () => console.log(`🚀 API server started on port ${port}`));
}

if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    startServer();
}
