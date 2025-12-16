// backend/src/services/deliveryAddressService.ts
import { z } from 'zod';
import { addressStorage } from '#storage/addressStorage';
import type { Address } from '#db/schema/addresses';
import {AppError, AppErrorCode} from "../middleware/errorHandler";

const AddressSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100).optional(),
  zip: z.string().regex(/^[0-9A-Za-z\-\s]{4,10}$/i, 'Invalid ZIP/Postal code'),
  country: z.string().min(2).max(100).default('Россия'),
  type: z.enum(['home', 'work']),
  isDefault: z.boolean().optional(),
});

const UpdateSchema = z.object({
  addressId: z.string().uuid(),
  userId: z.string().uuid(),
  patch: z
    .object({
      name: z.string().min(1).max(100).optional(),
      address: z.string().min(5).max(500).optional(),
      city: z.string().min(2).max(100).optional(),
      state: z.string().min(2).max(100).optional(),
      zip: z.string().regex(/^[0-9A-Za-z\-\s]{4,10}$/i, 'Invalid ZIP/Postal code').optional(),
      country: z.string().min(2).max(100).optional(),
      type: z.enum(['home', 'work']).optional(),
    })
    .strict(),
});

export const deliveryAddressService = {
  async createAddress(params: z.infer<typeof AddressSchema>): Promise<Address> {
    const data = AddressSchema.parse(params);
    const created = await addressStorage.create({
      userId: data.userId,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state ?? null,
      zip: data.zip,
      country: data.country,
      type: data.type,
      isDefault: Boolean(data.isDefault),
    } as any);

    if (data.isDefault) {
      await addressStorage.setDefault(data.userId, String(created.id));
      return (await addressStorage.getById(String(created.id)))!;
    }
    return created;
  },

  async getUserAddresses(userId: string): Promise<Address[]> {
    if (!z.string().uuid().safeParse(userId).success) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Invalid userId');
    }
    return addressStorage.listByUser(userId);
  },

  async getDefaultAddress(userId: string): Promise<Address | null> {
    if (!z.string().uuid().safeParse(userId).success) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, 'Invalid userId');
    }
    return addressStorage.getDefault(userId);
  },

  async updateAddress(params: z.infer<typeof UpdateSchema>): Promise<Address> {
    const { addressId, userId, patch } = UpdateSchema.parse(params);
    const existing = await addressStorage.getById(addressId);
    if (!existing || existing.userId !== userId) {
      throw new AppError(AppErrorCode.FORBIDDEN, 'Address not found or you are not the owner', 403);
    }

    const updated = await addressStorage.update(addressId, patch as any);
    if (!updated) throw new AppError(AppErrorCode.NOT_FOUND, 'Address not found', 404);
    return updated;
  },

  async setDefaultAddress(params: { userId: string; addressId: string }): Promise<void> {
    const s = z
      .object({ userId: z.string().uuid(), addressId: z.string().uuid() })
      .parse(params);

    const address = await addressStorage.getById(s.addressId);
    if (!address || address.userId !== s.userId) {
      throw new AppError(AppErrorCode.FORBIDDEN, 'Address not found or you are not the owner', 403);
    }

    await addressStorage.setDefault(s.userId, s.addressId);
  },

  async deleteAddress(params: { addressId: string; userId: string }): Promise<void> {
    const s = z
      .object({ addressId: z.string().uuid(), userId: z.string().uuid() })
      .parse(params);

    const existing = await addressStorage.getById(s.addressId);
    if (!existing || existing.userId !== s.userId) {
      throw new AppError(AppErrorCode.FORBIDDEN, 'Address not found or you are not the owner', 403);
    }

    const ok = await addressStorage.deleteById(s.addressId);
    if (!ok) throw new AppError(AppErrorCode.NOT_FOUND, 'Address not found', 404);

    // если удалили дефолтный — просто оставляем без дефолта (не выбираем новый автоматически)
  },
};
