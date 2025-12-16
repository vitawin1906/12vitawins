// backend/src/routes/media.routes.ts
import { Router } from 'express';
import { mediaController } from '../controllers/mediaController';

const router = Router();

/* ───────────────── Public Product Images Routes ───────────────── */
router.get('/products/:productId/images', ...mediaController.listProductImages);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminMediaRouter = Router();

// Media Management
adminMediaRouter.get('/', ...mediaController.listMedia);
adminMediaRouter.get('/stats', ...mediaController.getMediaStats);
adminMediaRouter.delete('/:id', ...mediaController.deleteMedia);
adminMediaRouter.get('/orphaned', ...mediaController.listOrphanedMedia);
adminMediaRouter.post('/cleanup', ...mediaController.cleanupOrphanedMedia);

// Product Images Management
adminMediaRouter.post('/products/:productId/images', ...mediaController.attachImageToProduct);
adminMediaRouter.put('/products/:productId/images/reorder', ...mediaController.reorderProductImages);
adminMediaRouter.delete(
    '/products/:productId/images/:imageId',
    ...mediaController.removeProductImage,
);

// Alias (deprecated) under /api/media for attach as well (kept via admin router).
