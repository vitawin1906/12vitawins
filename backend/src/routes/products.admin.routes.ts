// Admin routes for products (full CRUD)
import { Router } from 'express';
import { validateQuery, validateBody, validateParams } from '../middleware/validateRequest';
import { productsController } from '../controllers/productsController';

import {enhancedAdminProtection} from "../middleware/adminProtection";
import {
    ProductCreateDto,
    ProductIdParamDto,
    ProductListQueryDto,
    ProductSlugParamDto, ProductUpdateDto
} from "#db/shemaTypes/productsType";

export const adminProductsRouter = Router();

// Apply admin protection to all routes
// adminProductsRouter.use(enhancedAdminProtection);

/* ───────────────── Admin Read Routes ───────────────── */

// Get all products (admin can see all, including inactive)
adminProductsRouter.get(
    '/',
    validateQuery(ProductListQueryDto),
    ...productsController.getProducts,
);

// Get product by ID
adminProductsRouter.get(
    '/:id',
    validateParams(ProductIdParamDto),
    ...productsController.getProductById,
);

// Get product by slug
adminProductsRouter.get(
    '/slug/:slug',
    validateParams(ProductSlugParamDto),
    ...productsController.getProductBySlug,
);

/* ───────────────── Admin Create/Update/Delete ───────────────── */

// Create product (no multer - images come as metadata from frontend)
adminProductsRouter.post(
    '/',
    validateBody(ProductCreateDto),
    ...productsController.createProduct,
);

// Update product (PATCH - no multer)
adminProductsRouter.patch(
    '/:id',
    validateParams(ProductIdParamDto),
    validateBody(ProductUpdateDto),
    ...productsController.updateProduct,
);

// Update product (PUT - no multer)
adminProductsRouter.put(
    '/:id',
    validateParams(ProductIdParamDto),
    validateBody(ProductUpdateDto),
    ...productsController.updateProduct,
);

// Delete product
adminProductsRouter.delete(
    '/:id',
    validateParams(ProductIdParamDto),
    ...productsController.deleteProduct,
);



export default adminProductsRouter;
