import bcrypt from 'bcrypt';

import { usersStorage } from '#storage/usersStorage';
import ordersStorage from '#storage/ordersStorage';
import type { AppUser } from '#db/schema/users';

import { creatorPoolService } from './сreatorPoolService';
import { mlmNetworkService } from './mlmNetworkService';
import { attachChildToParent } from '#storage/mlmStorage';

import { nanoid } from 'nanoid';   // для салатового короткого рефкода

type AllowedRank = AppUser["rank"];

/* ───────────────────────────────
    INPUT TYPES
──────────────────────────────── */
export type CreateUserInput = {
    telegramId?: string | null;
    googleId?: string | null;

    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;

    password?: string | null;
    googleAvatar?: string | null;

    referrerCode?: string | null;   // код пригласившего
    referralCode?: string | null;   // свой публичный код

    referrerId?: string | null;

    rank?: AllowedRank;
};

export type UpdateUserInput = {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    mlmStatus?: 'customer' | 'partner' | 'partner_pro';
    rank?: AllowedRank;
};

/* ───────────────────────────────
    SERVICE
──────────────────────────────── */
export const userService = {

    /* ─────────────── Create ─────────────── */

    async createUser(data: CreateUserInput): Promise<AppUser> {
        /* 1) Идемпотентность — ТОЛЬКО по email/phone (как в Registry) */
        if (data.email) {
            const u = await usersStorage.getUserByEmail(data.email);
            if (u) return u; // идемпотентно
        }
        if (data.phone) {
            const u = await usersStorage.getUserByPhone(data.phone);
            if (u) return u;
        }

        /* 2) email validation */
        if (data.email) {
            await this.validateEmail(data.email);
        }

        /* 3) password → hash */
        const passwordHash = data.password
            ? await bcrypt.hash(data.password, 10)
            : null;

        /* 4) Генерация личного referralCode по Registry */
        const referralCode = data.referralCode ?? nanoid(10);

        /* 5) Определяем referrerId согласно Registry v0.4 */
        let referrerId: string | null = null;

        // Пришёл referrerId напрямую
        if (data.referrerId) {
            referrerId = data.referrerId;
        }

        // Пришёл referrerCode
        if (!referrerId && data.referrerCode) {
            const inviter = await usersStorage.getUserByReferralCode(data.referrerCode);
            if (inviter) referrerId = inviter.id;
        }

        // Creator Pool fallback
        if (!referrerId) {
            referrerId = await creatorPoolService.pickCreatorId();
        }

        /* 6) Создание пользователя */
        let user: AppUser;

        try {
            user = await usersStorage.createUser({
                telegramId: data.telegramId ?? null,
                googleId: data.googleId ?? null,

                username: data.username ?? null,
                firstName: data.firstName ?? null,
                lastName: data.lastName ?? null,
                email: data.email ?? null,
                phone: data.phone ?? null,
                googleAvatar: data.googleAvatar ?? null,

                passwordHash,
                referralCode,
                referrerId,

                mlmStatus: 'customer',
                rank: 'member',

                referrerLocked: false,
                option3Enabled: false,
            });

        } catch (e: any) {
            // мог сработать unique(referral_code)
            if (/referral_code/i.test(e.detail || '')) {
                // повторяем с новым кодом — idempotency сохраняется (email)
                const newCode = nanoid(10);
                const second = await usersStorage.createUser({
                    ...data,
                    referralCode: newCode,
                    passwordHash,
                    referrerId,
                    mlmStatus: 'customer',
                    rank: 'member',
                });
                return second;
            }
            throw e;
        }

        /* 7) MLM-граф (важен, но не критичен) */
        // Используем user.referrerId т.к. он прошёл валидацию (невалидные UUID → null)
        try {
            if (user.referrerId) {
                await attachChildToParent({ parentId: user.referrerId, childId: user.id });
            }
        } catch (err) {
            console.warn('⚠ MLM attach failed:', err);
        }

        return user;
    },

    /* ─────────────── Getters ─────────────── */

    async getUserById(id: string) {
        return usersStorage.getUserById(id);
    },

    async getUserByTelegram(telegramId: string) {
        return usersStorage.getUserByTelegramId(telegramId);
    },

    async getUserByEmail(email: string) {
        return usersStorage.getUserByEmail(email);
    },

    async listUsers(filters = {}) {
        return usersStorage.listUsers(filters);
    },

    /* ─────────────── Update ─────────────── */

    async updateUser(id: string, data: any) {
        if (data.email) {
            await this.validateEmail(data.email, id);
        }
        const updated = await usersStorage.updateUser(id, data);
        if (!updated) throw new Error("User not found");
        return updated;
    },

    /* User last_login */
    async updateLastLogin(userId: string) {
        await usersStorage.updateLastLogin(userId);
    },

    /* ─────────────── Password ─────────────── */

    async setPassword(userId: string, plainPassword: string) {
        if (!plainPassword || plainPassword.length < 6) {
            throw new Error("Password must be >= 6 chars");
        }
        const hash = await bcrypt.hash(plainPassword, 10);
        await usersStorage.updateUser(userId, { passwordHash: hash });
    },

    async verifyPassword(userId: string, plainPassword: string) {
        const user = await usersStorage.getUserById(userId);
        if (!user?.passwordHash) return false;
        return bcrypt.compare(plainPassword, user.passwordHash);
    },

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await usersStorage.getUserById(userId);
        if (!user) throw new Error('User not found');

        if (!user.passwordHash) throw new Error('Password is not set');

        const valid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!valid) throw new Error('Old password is incorrect');

        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await usersStorage.updateUser(userId, { passwordHash: newHash });
    },

    /* ─────────────── MLM Status / Rank ─────────────── */

    async upgradeToPartner(userId: string, options: { requireFirstOrder?: boolean } = {}) {
        const user = await usersStorage.getUserById(userId);
        if (!user) throw new Error("User not found");
        if (user.mlmStatus !== 'customer') return;

        if (options.requireFirstOrder) {
            const orders = await ordersStorage.list({
                userId,
                deliveryStatus: 'delivered',
                limit: 1
            });
            if (!orders.length) throw new Error("First order required");
        }

        await usersStorage.updateUser(userId, {
            mlmStatus: 'partner',
            rank: 'лидер'
        });
    },

    async recalculateRank(userId: string) {
        const stats = await mlmNetworkService.getUserNetworkStats(userId);

        let newRank: AllowedRank = 'member';

        if (stats.personalVolume.totalPV >= 1000 && stats.groupVolume.totalPV >= 10000) {
            newRank = 'creator';
        } else if (stats.personalVolume.totalPV >= 100) {
            newRank = 'leader';
        }

        const user = await usersStorage.getUserById(userId);
        if (user?.rank !== newRank) {
            await usersStorage.updateUser(userId, { rank: newRank });
        }
    },

    /* ─────────────── Validate ─────────────── */

    async validateEmail(email: string, excludeId?: string) {
        const user = await usersStorage.getUserByEmail(email);
        if (user && user.id !== excludeId) {
            throw new Error("Email already in use");
        }
    },

    /* ─────────────── Partners ─────────────── */

    async listActivePartners() {
        return usersStorage.listActivePartners();
    },

    /* ─────────────── User Status ─────────────── */

    async reactivateUser(userId: string) {
        const user = await usersStorage.getUserById(userId);
        if (!user) throw new Error('User not found');

        return usersStorage.updateUser(userId, { deletedAt: null });
    },

    async deactivateUser(userId: string) {
        const user = await usersStorage.getUserById(userId);
        if (!user) throw new Error('User not found');

        return usersStorage.updateUser(userId, { deletedAt: new Date() });
    },

    async lockReferrer(userId: string) {
        const user = await usersStorage.getUserById(userId);
        if (!user) throw new Error('User not found');

        return usersStorage.updateUser(userId, { referrerLocked: true });
    },

    async unlockReferrer(userId: string) {
        const user = await usersStorage.getUserById(userId);
        if (!user) throw new Error('User not found');

        return usersStorage.updateUser(userId, { referrerLocked: false });
    },
};

export default userService;
