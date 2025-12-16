// backend/src/controllers/addressController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { deliveryAddressService } from "../services/deliveryAddressService";

// CREATE body
const CreateBody = z.object({
    name: z.string().min(1).max(100),
    address: z.string().min(5).max(500),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100).optional(),
    zip: z.string().regex(/^[0-9A-Za-z\-\s]{4,10}$/i, 'Invalid ZIP/Postal code'),
    country: z.string().min(2).max(100).default('Россия').optional(),
    type: z.enum(['home', 'work']),
    isDefault: z.boolean().optional(),
});

// UPDATE body
const UpdateBody = z.object({
    name: z.string().min(1).max(100).optional(),
    address: z.string().min(5).max(500).optional(),
    city: z.string().min(2).max(100).optional(),
    state: z.string().min(2).max(100).optional(),
    zip: z.string().regex(/^[0-9A-Za-z\-\s]{4,10}$/i, 'Invalid ZIP/Postal code').optional(),
    country: z.string().min(2).max(100).optional(),
    type: z.enum(['home', 'work']).optional(),
});

// UUID вместо числа
const IdParam = z.object({ id: z.string().uuid() });

export const addressController = {
    // GET /api/addresses
    list: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const data = await deliveryAddressService.getUserAddresses(req.user!.id);
            return res.json({ success: true, data });
        }),
    ],

    // GET /api/addresses/default
    getDefault: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const data = await deliveryAddressService.getDefaultAddress(req.user!.id);
            return res.json({ success: true, data });
        }),
    ],

    // POST /api/addresses
    create: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const body = CreateBody.parse(req.body);
            const created = await deliveryAddressService.createAddress({
                ...body,
                userId: req.user!.id,
            } as any);

            return res.status(201).json({ success: true, data: created });
        }),
    ],

    // PUT /api/addresses/:id
    update: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);
            const patch = UpdateBody.parse(req.body ?? {});

            const updated = await deliveryAddressService.updateAddress({
                addressId: id,
                userId: req.user!.id,
                patch,
            });

            return res.json({ success: true, data: updated });
        }),
    ],

    // DELETE /api/addresses/:id
    remove: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);

            await deliveryAddressService.deleteAddress({
                addressId: id,
                userId: req.user!.id,
            });

            return res.json({ success: true, data: { id, deleted: true } });
        }),
    ],

    // POST /api/addresses/:id/set-default
    setDefault: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const { id } = IdParam.parse(req.params);

            await deliveryAddressService.setDefaultAddress({
                userId: req.user!.id,
                addressId: id,
            });

            return res.json({ success: true, data: { id, isDefault: true } });
        }),
    ],
};
