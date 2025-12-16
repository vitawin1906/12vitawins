// src/routes/reviews.routes.ts
import { Router } from 'express';
import { reviewController } from '../controllers/reviewController';
import { reviewLimiter } from '../middleware/rateLimiter';

const reviewsRouter = Router();

// Public
reviewsRouter.get('/', ...reviewController.listPublic);

// User
reviewsRouter.post('/', reviewLimiter, ...reviewController.create);
reviewsRouter.put('/:id', ...reviewController.update);
reviewsRouter.delete('/:id', ...reviewController.remove);

// Admin
const adminReviewsRouter = Router();
adminReviewsRouter.get('/', ...reviewController.adminList);
adminReviewsRouter.post('/:id/approve', ...reviewController.adminApprove);
adminReviewsRouter.post('/:id/reject', ...reviewController.adminReject);

export default reviewsRouter;
export { adminReviewsRouter };
