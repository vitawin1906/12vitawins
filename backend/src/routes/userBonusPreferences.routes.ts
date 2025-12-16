// backend/src/routes/userBonusPreferences.routes.ts
import { Router } from 'express';
import { userBonusPreferencesController } from '../controllers/userBonusPreferencesController';

const router = Router();

/* ───────────────── User Bonus Preferences Routes ───────────────── */
/**
 * @openapi
 * /api/bonus-preferences:
 *   get:
 *     tags: [Users]
 *     summary: Текущие бонусные предпочтения пользователя
 *     description: Возвращает распределение бонусов по категориям health/travel/home/auto. Если запись отсутствует — создаётся с дефолтными значениями. Также возвращает флаги `locked` и `referrerLocked`.
 *     operationId: bonusPreferences_get
 *     security: [ { BearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *             examples:
 *               example:
 *                 value:
 *                   success: true
 *                   data:
 *                     healthPercent: 25
 *                     travelPercent: 25
 *                     homePercent: 25
 *                     autoPercent: 25
 *                     locked: false
 *                     referrerLocked: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', ...userBonusPreferencesController.getUserPreferences);

/**
 * @openapi
 * /api/bonus-preferences:
 *   put:
 *     tags: [Users]
 *     summary: Обновить бонусные предпочтения пользователя
 *     description: Полностью задаёт проценты по категориям. Каждое поле — целое 0..100, сумма четырёх полей должна быть равна 100. Запрещено изменять, если настройки заблокированы (возвращает 403).
 *     operationId: bonusPreferences_update
 *     security: [ { BearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               health_percent: { type: integer, minimum: 0, maximum: 100 }
 *               travel_percent: { type: integer, minimum: 0, maximum: 100 }
 *               home_percent: { type: integer, minimum: 0, maximum: 100 }
 *               auto_percent: { type: integer, minimum: 0, maximum: 100 }
 *             required: [health_percent, travel_percent, home_percent, auto_percent]
 *           examples:
 *             valid:
 *               value: { health_percent: 40, travel_percent: 20, home_percent: 20, auto_percent: 20 }
 *             invalid_sum:
 *               value: { health_percent: 60, travel_percent: 20, home_percent: 20, auto_percent: 10 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       400:
 *         description: Bad Request (валидация процентов)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden (настройки заблокированы)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/', ...userBonusPreferencesController.updateUserPreferences);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminBonusPreferencesRouter = Router();

/**
 * @openapi
 * /api/admin/bonus-preferences/{userId}/lock:
 *   post:
 *     tags: [Admin]
 *     summary: Заблокировать/разблокировать бонусные предпочтения пользователя
 *     operationId: admin_bonusPreferences_lock
 *     security: [ { BearerAuth: [] } ]
 *     x-roles: ["admin"]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { $ref: '#/components/schemas/UUID' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isLocked: { type: boolean }
 *             required: [isLocked]
 *           examples:
 *             lock:
 *               value: { isLocked: true }
 *             unlock:
 *               value: { isLocked: false }
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Not Found (пользователь не найден)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
adminBonusPreferencesRouter.post('/:userId/lock', ...userBonusPreferencesController.lockUserPreferences);
