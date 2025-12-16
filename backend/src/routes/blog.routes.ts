// backend/src/routes/blog.routes.ts
import { Router } from 'express';
import { blogController } from '../controllers/blogController';

const router = Router();

/* ───────────────── Public Routes ───────────────── */
router.get('/', ...blogController.listPublishedPosts);
router.get('/:urlOrId', ...blogController.getPostByUrlOrId);

export default router;

/* ───────────────── Admin Routes ───────────────── */
export const adminBlogRouter = Router();

adminBlogRouter.get('/', ...blogController.listAllPosts);
adminBlogRouter.post('/', ...blogController.createPost);
adminBlogRouter.get('/:id', ...blogController.getPostById);
adminBlogRouter.put('/:id', ...blogController.updatePost);
adminBlogRouter.delete('/:id', ...blogController.deletePost);
adminBlogRouter.put('/:id/hero-image', ...blogController.setHeroImage);
adminBlogRouter.post('/:id/publish', ...blogController.publishPost);
adminBlogRouter.post('/:id/unpublish', ...blogController.unpublishPost);
