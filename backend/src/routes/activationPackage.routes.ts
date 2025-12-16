// backend/src/routes/activationPackage.routes.ts
import { Router } from 'express';
import { activationPackageController } from '../controllers/activationPackageController';

const router = Router();

/**
 * Activation Package Routes
 * Registry.md 3.2: Partner (7500) / Partner Pro (30000)
 */

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC (требуется auth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/activation-packages/partner
 * @desc    Купить пакет Partner (7500 RUB)
 * @access  Private (auth required)
 */
router.post('/partner', ...activationPackageController.purchasePartner);

/**
 * @route   POST /api/activation-packages/partner-pro
 * @desc    Купить пакет Partner Pro (30000 RUB)
 * @access  Private (auth required)
 */
router.post('/partner-pro', ...activationPackageController.purchasePartnerPro);

/**
 * @route   POST /api/activation-packages/upgrade
 * @desc    Upgrade Partner → Partner Pro (в течение 5 недель)
 * @access  Private (auth required)
 */
router.post('/upgrade', ...activationPackageController.upgradeToPartnerPro);

/**
 * @route   GET /api/activation-packages/my
 * @desc    Получить мои пакеты активации
 * @access  Private (auth required)
 */
router.get('/my', ...activationPackageController.getMyPackages);

/**
 * @route   GET /api/activation-packages/can-upgrade
 * @desc    Проверить, могу ли я апгрейдиться до Partner Pro
 * @access  Private (auth required)
 */
router.get('/can-upgrade', ...activationPackageController.checkMyUpgradeEligibility);

export default router;
