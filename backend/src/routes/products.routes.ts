// Public routes for products (read-only)
import { Router } from 'express';
import { validateQuery, validateParams } from '../middleware/validateRequest';
import { productsController } from '../controllers/productsController';
import {ProductIdParamDto, ProductListQueryDto, ProductSlugParamDto} from "#db/shemaTypes/productsType";

export const productsRouter = Router();

/* ───────────────── Public Read-Only Routes ───────────────── */

// Get product by slug
productsRouter.get(
    '/slug/:slug',
    validateParams(ProductSlugParamDto),
    ...productsController.getProductBySlug,
);

// Get all products (with filters)
productsRouter.get(
    '/',
    validateQuery(ProductListQueryDto),
    ...productsController.getProducts,
);

// Get product by ID
productsRouter.get(
    '/:id',
    validateParams(ProductIdParamDto),
    ...productsController.getProductById,
);

export default productsRouter;
