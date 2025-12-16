// backend/src/routes/admin/activationPackage.routes.ts
import { Router } from 'express';
import { activationPackageController } from '../../controllers/activationPackageController';

const router = Router();

/**
 * Admin Activation Package Routes
 * Требуется auth + admin права
 */

/**
 * @route   GET /api/admin/activation-packages
 * @desc    Получить все пакеты активации (с пагинацией)
 * @access  Admin
 */
router.get('/', ...activationPackageController.getAllPackages);

/**
 * @route   GET /api/admin/activation-packages/stats
 * @desc    Статистика по пакетам (Partner / Partner Pro)
 * @access  Admin
 */
router.get('/stats', ...activationPackageController.getStats);

/**
 * @route   GET /api/admin/activation-packages/user/:userId
 * @desc    Получить пакеты конкретного пользователя
 * @access  Admin
 */
router.get('/user/:userId', ...activationPackageController.getUserPackages);

/**
 * @route   GET /api/admin/activation-packages/:userId/can-upgrade
 * @desc    Проверить, может ли пользователь апгрейдиться до Partner Pro
 * @access  Admin
 */
router.get('/:userId/can-upgrade', ...activationPackageController.checkUserUpgradeEligibility);

export default router;
