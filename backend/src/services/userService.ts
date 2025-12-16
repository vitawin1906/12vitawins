import bcrypt from 'bcrypt';

import { usersStorage } from '#storage/usersStorage';
import ordersStorage from '#storage/ordersStorage';
import type { AppUser } from '#db/schema/users';

import { creatorPoolService } from './сreatorPoolService';
import { mlmNetworkService } from './mlmNetworkService';
import { attachChildToParent } from '#storage/mlmStorage';

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
    referralCode?: string | null;   // свой код (не обязателен)

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
        // ✅ Registry v0.4.1: Idempotency by email OR phone ONLY (NOT telegramId)
        if (data.email) {
            const existingByEmail = await usersStorage.getUserByEmail(data.email);
            if (existingByEmail) return existingByEmail;
        }

        if (data.phone) {
            const existingByPhone = await usersStorage.getUserByPhone(data.phone);
            if (existingByPhone) return existingByPhone;
        }

        // ✅ Email validation
        if (data.email) {
            await this.validateEmail(data.email);
        }

        // ✅ Password hash
        const passwordHash = data.password
            ? await bcrypt.hash(data.password, 10)
            : null;

        // ✅ Registry v0.4.1: Generate referralCode via nanoid/base36 (NOT telegramId)
        const referralCode = data.referralCode ?? this.generateReferralCode();

        // ✅ Registry v0.4.1: Referrer resolution order (STRICT)
        let referrerId: string | null = null;

        // 1) If referrerId explicitly provided → use it
        if (data.referrerId) {
            referrerId = data.referrerId;
        }
        // 2) Else if referrerCode provided → find by referralCode → use id
        else if (data.referrerCode) {
            const inviter = await usersStorage.getUserByReferralCode(data.referrerCode);
            if (inviter) {
                referrerId = inviter.id;
            }
        }
        // 3) Else → CreatorPoolService.pickCreatorId()
        if (!referrerId) {
            referrerId = await creatorPoolService.pickCreatorId();
            if (!referrerId) {
                throw new Error('Creator pool is empty - cannot assign referrer');
            }
        }

        // 6) Создание пользователя
        let user: AppUser;

        try {
            user = await usersStorage.createUser({
                telegramId: data.telegramId,
                username: data.username ?? null,
                firstName: data.firstName ?? null,
                lastName: data.lastName ?? null,
                email: data.email ?? null,
                phone: data.phone ?? null,

                passwordHash,

                referralCode,
                referrerId,

                mlmStatus: 'customer',
                rank: 'member'
            });
        } catch (e: any) {
            if (data.telegramId) {
                const again = await usersStorage.getUserByTelegramId(data.telegramId);
                if (again) return again;
            }
            throw e;
        }

        // 7) MLM-граф (не критично — ошибки не ломают регистрацию)
        try {
            if (referrerId) {
                await attachChildToParent({ parentId: referrerId, childId: user.id });
            }
        } catch (err) {
            console.warn('MLM attach failed:', err);
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
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.passwordHash) {
            throw new Error('Password is not set');
        }

        const valid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!valid) {
            throw new Error('Old password is incorrect');
        }

        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await usersStorage.updateUser(userId, { passwordHash: newHash });
    },


    /* ─────────────── MLM Status / Rank ─────────────── */

    async upgradeToPartner(
        userId: string,
        options: { requireFirstOrder?: boolean; minPV?: number } = {}
    ) {
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
            newRank = 'создатель';
        } else if (stats.personalVolume.totalPV >= 100) {
            newRank = 'лидер';
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

    /**
     * ✅ Registry v0.4.1: Generate unique referralCode via base36/nanoid
     * NOT based on telegramId, email, or phone
     */
    generateReferralCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = 8;
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
};

export default userService;
