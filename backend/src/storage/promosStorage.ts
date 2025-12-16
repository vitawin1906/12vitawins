// src/storage/promotionsStorage.ts
import { db } from '#db/db';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import {
    promotion,
    promotionProduct,
    type Promotion,
    type NewPromotion,
    type PromotionProduct,
    type NewPromotionProduct,
} from '#db/schema/promotions';

/* ───────── helpers ───────── */

function must<T>(row: T | undefined, msg = 'Row not found'): T {
    if (row === undefined) throw new Error(msg);
    return row;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out as Partial<T>;
}

type NumLike = number | string | null | undefined;
function toPgNum(v: NumLike): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    return typeof v === 'number' ? v.toFixed(2) : v;
}

/* ───────── promotionsStorage ───────── */

export const promotionsStorage = {
    /* ───── PROMOTIONS CRUD ───── */

    async createPromotion(input: {
        name: string;
        kind: string;
        isActive?: boolean;
        startsAt?: Date | null;
        endsAt?: Date | null;
        buyQty?: number | null;
        getQty?: number | null;
        percentOff?: NumLike;
        fixedPriceRub?: NumLike;
    }): Promise<Promotion> {
        const payload: NewPromotion = {
            name: input.name,
            kind: input.kind,
            isActive: input.isActive ?? true,
            startsAt: input.startsAt ?? null,
            endsAt: input.endsAt ?? null,
            buyQty: input.buyQty ?? null,
            getQty: input.getQty ?? null,
            percentOff: toPgNum(input.percentOff),
            fixedPriceRub: toPgNum(input.fixedPriceRub),
        };

        const [row] = await db.insert(promotion).values(payload).returning();
        return must(row, 'Failed to create promotion');
    },

    async updatePromotion(id: number, patch: Partial<NewPromotion>): Promise<Promotion> {
        const data = stripUndefined({
            name: patch.name,
            kind: patch.kind,
            startsAt: patch.startsAt ?? undefined,
            endsAt: patch.endsAt ?? undefined,
            isActive: patch.isActive ?? undefined,
            buyQty: patch.buyQty ?? undefined,
            getQty: patch.getQty ?? undefined,
            percentOff: toPgNum(patch.percentOff),
            fixedPriceRub: toPgNum(patch.fixedPriceRub),
        });

        if (Object.keys(data).length === 0) {
            const existing = await this.getPromotionById(id);
            return must(existing ?? undefined, 'Promotion not found');
        }

        const [row] = await db
            .update(promotion)
            .set(data)
            .where(eq(promotion.id, id))
            .returning();
        return must(row, 'Promotion not found');
    },

    async deletePromotion(id: number): Promise<boolean> {
        const res = await db
            .delete(promotion)
            .where(eq(promotion.id, id))
            .returning({ id: promotion.id });
        return res.length > 0;
    },

    async getPromotionById(id: number): Promise<Promotion | null> {
        const [row] = await db
            .select()
            .from(promotion)
            .where(eq(promotion.id, id))
            .limit(1);
        return row ?? null;
    },

    async listPromotions(opts: {
        activeOnly?: boolean;
        limit?: number;
        offset?: number;
    } = {}): Promise<Promotion[]> {
        const { activeOnly = false, limit = 100, offset = 0 } = opts;

        let qb = db.select().from(promotion).$dynamic();
        if (activeOnly) qb = qb.where(eq(promotion.isActive, true));

        return qb
            .orderBy(desc(promotion.startsAt))
            .limit(limit)
            .offset(offset);
    },

    async activatePromotion(id: number, active = true): Promise<Promotion> {
        const [row] = await db
            .update(promotion)
            .set({ isActive: active })
            .where(eq(promotion.id, id))
            .returning();
        return must(row);
    },

    /* ───── PROMOTION PRODUCTS ───── */

    async addProductToPromotion(input: {
        promotionId: number;
        productId: string;
    }): Promise<PromotionProduct> {
        const payload: NewPromotionProduct = {
            promotionId: input.promotionId,
            productId: input.productId,
        };

        const [row] = await db.insert(promotionProduct).values(payload).returning();
        return must(row, 'Failed to link product to promotion');
    },

    async removeProductFromPromotion(promotionId: number, productId: string): Promise<boolean> {
        const res = await db
            .delete(promotionProduct)
            .where(
                and(
                    eq(promotionProduct.promotionId, promotionId),
                    eq(promotionProduct.productId, productId)
                )
            )
            .returning({ promotionId: promotionProduct.promotionId });
        return res.length > 0;
    },

    async listPromotionProducts(promotionId: number): Promise<PromotionProduct[]> {
        return db
            .select()
            .from(promotionProduct)
            .where(eq(promotionProduct.promotionId, promotionId))
            .orderBy(asc(promotionProduct.productId));
    },

    async getPromotionProduct(
        promotionId: number,
        productId: string
    ): Promise<PromotionProduct | null> {
        const [row] = await db
            .select()
            .from(promotionProduct)
            .where(
                and(
                    eq(promotionProduct.promotionId, promotionId),
                    eq(promotionProduct.productId, productId)
                )
            )
            .limit(1);
        return row ?? null;
    },

    /* ───── HELPERS / ANALYTICS ───── */

    async countActivePromotions(): Promise<number> {
        const [row] = await db
            .select({ cnt: sql<number>`count(*)` })
            .from(promotion)
            .where(eq(promotion.isActive, true));
        return Number(row?.cnt ?? 0);
    },

    async listActivePromotionsAt(date: Date): Promise<Promotion[]> {
        return db
            .select()
            .from(promotion)
            .where(
                and(
                    eq(promotion.isActive, true),
                    sql`${promotion.startsAt} IS NULL OR ${promotion.startsAt} <= ${date}`,
                    sql`${promotion.endsAt} IS NULL OR ${promotion.endsAt} >= ${date}`
                )
            )
            .orderBy(asc(promotion.startsAt));
    },
};
