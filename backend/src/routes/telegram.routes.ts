import { Router } from 'express';
import { telegramController } from '../controllers/telegramController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Публичные эндпоинты
router.post('/webhook', (req, res) => telegramController.webhook(req, res));
router.post('/auth', (req, res) => telegramController.telegramAuth(req, res));

// Админские эндпоинты для управления ботом
router.post('/set-webhook', authMiddleware, adminMiddleware, (req, res) => telegramController.setWebhook(req, res));
router.post('/delete-webhook', authMiddleware, adminMiddleware, (req, res) => telegramController.deleteWebhook(req, res));
router.get('/webhook-info', authMiddleware, adminMiddleware, (req, res) => telegramController.getWebhookInfo(req, res));
router.post('/setup', authMiddleware, adminMiddleware, (req, res) => telegramController.setupBot(req, res));
router.post('/start-polling', authMiddleware, adminMiddleware, (req, res) => telegramController.startPolling(req, res));

export default router;
