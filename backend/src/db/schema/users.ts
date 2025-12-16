import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    jsonb,
    numeric,
    index,
    uniqueIndex
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { uploadedMedia } from './media';
import { mlmRankEnum, mlmStatusEnum } from './enums';

export const appUser: any = pgTable(
    'app_user',
    {
        /* ────────────────────────────
           Core Identity
        ──────────────────────────── */
        id: uuid('id').primaryKey().defaultRandom(),

        /* Telegram / Email / Auth */
        telegramId: text('telegram_id'),                 // может быть null → пользователь без TG
        googleId: text('google_id'),
        email: text('email'),
        phone: text('phone'),

        /* Names */
        firstName: text('first_name'),
        lastName: text('last_name'),
        username: text('username'),

        /* Media */
        googleAvatar: text('google_avatar'),
        avatarMediaId: uuid('avatar_media_id')
            .references(() => uploadedMedia.id, { onDelete: 'set null' }),

        /* ────────────────────────────
           Referral System (SSOT)
        ──────────────────────────── */
        referralCode: text('referral_code').notNull(),     // публичный реф-код, уникальный
        appliedReferralCode: text('applied_referral_code'), // использованный при регистрации

        referrerId: text('referrer_id'),

        referrerLocked: boolean('referrer_locked')
            .notNull()
            .default(false),

        /* Admin / Auth */
        isAdmin: boolean('is_admin').notNull().default(false),
        passwordHash: text('password_hash'),

        /* Баланс (ledger) */
        balance: numeric('balance', { precision: 12, scale: 2 })
            .notNull()
            .default('0'),

        /* ────────────────────────────
           MLM Roles / Status
        ──────────────────────────── */
        mlmStatus: mlmStatusEnum('mlm_status')
            .notNull()
            .default('customer'),

        rank: mlmRankEnum('rank')
            .notNull()
            .default('member'),

        activatedAt: timestamp('activated_at', { withTimezone: true }),
        upgradeDeadlineAt: timestamp('upgrade_deadline_at', { withTimezone: true }),
        lastLogin: timestamp('last_login', { withTimezone: true }),

        /* Special Logic */
        canReceiveFirstlineBonus: boolean('can_receive_firstline_bonus')
            .notNull()
            .default(false),

        option3Enabled: boolean('option3_enabled')
            .notNull()
            .default(false),

        /* Freedom Shares (до перехода на переменную матрицу) */
        freedomShares: jsonb('freedom_shares')
            .$type<[number, number, number, number]>()
            .notNull()
            .default(sql`'[25,25,25,25]'::jsonb`),

        /* Activity */
        isActive: boolean('is_active').notNull().default(true),
        deletedAt: timestamp('deleted_at', { withTimezone: true }),

        /* System timestamps */
        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },

    /* ────────────────────────────
       Indexes & Constraints
    ──────────────────────────── */
    (t) => ({
        uxTelegram: uniqueIndex('ux_app_user_telegram').on(t.telegramId),
        uxGoogle: uniqueIndex('ux_app_user_google').on(t.googleId),
        uxEmail: uniqueIndex('ux_app_user_email').on(t.email),
        uxReferralCode: uniqueIndex('ux_app_user_referral_code').on(t.referralCode),

        ixActive: index('ix_app_user_active').on(t.isActive),
    })
);

export type AppUser = typeof appUser.$inferSelect;
export type NewAppUser = typeof appUser.$inferInsert;
