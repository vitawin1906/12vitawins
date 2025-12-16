// backend/src/routes/admin/auth.routes.ts
import { Router } from 'express';
import { adminAuthController } from '../../controllers/adminAuthController';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import {authController} from "../../controllers/authController";
import { adminAuthLimiter } from '../../middleware/rateLimiter';

const adminAuthRouter = Router();

/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Вход администратора по email и паролю
 *     operationId: admin_login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: OK
 *         headers:
 *           Set-Cookie:
 *             schema: { type: string }
 *             description: Устанавливает httpOnly cookie `admin_session`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
adminAuthRouter.post('/login', adminAuthLimiter, adminAuthController.login);

/**
 * @openapi
 * /api/admin/logout:
 *   post:
 *     tags: [Admin]
 *     summary: Выход администратора (очистка сессии)
 *     operationId: admin_logout
 *     security: [ { BearerAuth: [] } ]
 *     x-roles: ["admin"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
adminAuthRouter.post('/logout', authMiddleware, adminMiddleware, adminAuthController.logout);

/**
 * @openapi
 * /api/admin/me:
 *   get:
 *     tags: [Admin]
 *     summary: Текущий админ-пользователь
 *     operationId: admin_me
 *     security: [ { BearerAuth: [] } ]
 *     x-roles: ["admin"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
adminAuthRouter.get('/me', authMiddleware, adminMiddleware, adminAuthController.me);

export default adminAuthRouter;
