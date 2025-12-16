// src/storage/addressStorage.ts
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '#db/db';
import { address, type Address, type NewAddress } from '#db/schema/addresses';

// Хранилище адресов пользователя (UUID-ids)
export const addressStorage = {

    // CREATE
    async create(input: NewAddress): Promise<Address> {
        const [row] = await db.insert(address).values(input).returning();
        return row!;
    },

    // GET BY ID (UUID string)
    async getById(id: string): Promise<Address | null> {
        const [row] = await db
            .select()
            .from(address)
            .where(eq(address.id, id))  // <-- id: string OK
            .limit(1);

        return row ?? null;
    },

    // LIST BY USER
    async listByUser(userId: string): Promise<Address[]> {
        return db
            .select()
            .from(address)
            .where(eq(address.userId, userId)) // <-- userId: string
            .orderBy(desc(address.isDefault), asc(address.createdAt));
    },

    // UPDATE
    async update(id: string, patch: Partial<NewAddress>): Promise<Address | null> {
        const { userId, ...rest } = patch as any;

        const [row] = await db
            .update(address)
            .set({ ...rest, updatedAt: new Date() })
            .where(eq(address.id, id)) // <-- id: string OK
            .returning();

        return row ?? null;
    },

    // DELETE
    async deleteById(id: string): Promise<boolean> {
        const res = await db
            .delete(address)
            .where(eq(address.id, id)) // <-- id: string OK
            .returning({ id: address.id });

        return res.length > 0;
    },

    // SET DEFAULT
    async setDefault(userId: string, addressId: string): Promise<void> {
        await db.transaction(async (tx) => {
            // снимаем default у всех адресов
            await tx
                .update(address)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(eq(address.userId, userId)); // string

            // включаем default на конкретном
            const [row] = await tx
                .update(address)
                .set({ isDefault: true, updatedAt: new Date() })
                .where(
                    and(
                        eq(address.userId, userId),     // string
                        eq(address.id, addressId)       // string
                    )
                )
                .returning();

            if (!row) throw new Error('Address not found for this user');
        });
    },

    // GET DEFAULT
    async getDefault(userId: string): Promise<Address | null> {
        const [row] = await db
            .select()
            .from(address)
            .where(
                and(
                    eq(address.userId, userId),   // string
                    eq(address.isDefault, true)
                )
            )
            .limit(1);

        return row ?? null;
    },

    // UNSET DEFAULT
    async unsetDefault(userId: string): Promise<void> {
        await db
            .update(address)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(address.userId, userId));
    },
};
