// backend/src/db/schema/activationPackage.ts
import {
    pgTable,
    uuid,
    text,
    numeric,
    timestamp,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol } from './_common';
import { appUser } from './users';

/**
 * activation_package — пакеты активации partner/partner_pro
 * Registry.md v0.4:
 *   type='partner' → 7500 RUB → mlm_status=partner
 *   type='partner_pro' → 30000 RUB → mlm_status=partner_pro
 *   upgrade partner→partner_pro разрешён 5 недель от activated_at
 */
export const activationPackage = pgTable(
    'activation_package',
    {
        id: uuid('id').primaryKey().defaultRandom(),

        userId: uuid('user_id')
            .notNull()
            .references(() => appUser.id, { onDelete: 'cascade' }),

        // 'partner' | 'partner_pro'
        type: text('type').notNull(),

        // 7500 или 30000
        amountRub: numeric('amount_rub', { precision: 12, scale: 2 }).notNull(),

        createdAt: createdAtCol(),
    },
    (t) => ({
        ixUser: index('ix_activation_package_user').on(t.userId),
        ixType: index('ix_activation_package_type').on(t.type),
        ixCreated: index('ix_activation_package_created').on(t.createdAt),

        // CHECK constraints
        chkType: check(
            'chk_activation_package_type',
            sql`${t.type} IN ('partner', 'partner_pro')`
        ),
        chkAmount: check(
            'chk_activation_package_amount',
            sql`${t.amountRub} > 0`
        ),
    })
);

export type ActivationPackage = typeof activationPackage.$inferSelect;
export type NewActivationPackage = typeof activationPackage.$inferInsert;
