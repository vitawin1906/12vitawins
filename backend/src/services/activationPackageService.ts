// backend/src/services/activationPackageService.ts
import * as activationPackageStorage from '../storage/activationPackageStorage';
import { usersStorage } from '../storage/usersStorage';
import { ledgerStorage } from '../storage/ledgerStorage';
import type { ActivationPackage } from '../db/schema/activationPackage';

/**
 * Service layer for Activation Packages
 * Registry.md 3.2:
 *   - Partner: 7500 RUB → mlm_status=partner
 *   - Partner Pro: 30000 RUB → mlm_status=partner_pro
 *   - Upgrade partner→partner_pro: разрешён 5 недель от activated_at
 */

export class ActivationPackageService {
    /**
     * Покупка пакета Partner (7500 RUB)
     * Изменяет mlm_status на 'partner' и устанавливает activated_at
     */
    async purchasePartnerPackage(userId: string): Promise<ActivationPackage> {
        // Проверить, что пользователь существует
        const user = await usersStorage.getUserById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Проверить, что у пользователя нет пакета Partner
        const existingPartner = await activationPackageStorage.getByUserIdAndType(userId, 'partner');
        if (existingPartner) {
            throw new Error('User already has Partner package');
        }

        // Проверить, что статус = customer
        if (user.mlmStatus !== 'customer') {
            throw new Error(`User already has status ${user.mlmStatus}`);
        }

        // Создать запись о покупке пакета
        const packageRecord = await activationPackageStorage.create({
            userId,
            type: 'partner',
            amountRub: '7500.00',
        });

        // Обновить статус пользователя
        const now = new Date();
        const upgradeDeadline = new Date(now.getTime() + 5 * 7 * 24 * 60 * 60 * 1000); // +5 недель

        await usersStorage.updateUser(userId, {
            mlmStatus: 'partner',
            activatedAt: now,
            upgradeDeadlineAt: upgradeDeadline,
        });

        // Начислить активационный бонус рефереру (если есть)
        if (user.referrerId) {
            await this.grantActivationBonus(user.referrerId, userId, 'partner');
        }

        console.log(`✅ User ${userId} purchased Partner package (7500 RUB)`);
        return packageRecord;
    }

    /**
     * Покупка пакета Partner Pro (30000 RUB)
     * Изменяет mlm_status на 'partner_pro'
     */
    async purchasePartnerProPackage(userId: string): Promise<ActivationPackage> {
        // Проверить, что пользователь существует
        const user = await usersStorage.getUserById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Проверить, что у пользователя нет пакета Partner Pro
        const existingPro = await activationPackageStorage.getByUserIdAndType(userId, 'partner_pro');
        if (existingPro) {
            throw new Error('User already has Partner Pro package');
        }

        // Проверить, что статус = customer
        if (user.mlmStatus !== 'customer') {
            throw new Error(`User already has status ${user.mlmStatus}`);
        }

        // Создать запись о покупке пакета
        const packageRecord = await activationPackageStorage.create({
            userId,
            type: 'partner_pro',
            amountRub: '30000.00',
        });

        // Обновить статус пользователя
        const now = new Date();
        await usersStorage.updateUser(userId, {
            mlmStatus: 'partner_pro',
            activatedAt: now,
            upgradeDeadlineAt: null, // для partner_pro deadline не нужен
        });

        // Начислить активационный бонус рефереру (если есть)
        if (user.referrerId) {
            await this.grantActivationBonus(user.referrerId, userId, 'partner_pro');
        }

        console.log(`✅ User ${userId} purchased Partner Pro package (30000 RUB)`);
        return packageRecord;
    }

    /**
     * Upgrade Partner → Partner Pro
     * Registry.md: разрешён 5 недель от activated_at
     */
    async upgradeToPartnerPro(userId: string): Promise<ActivationPackage> {
        // Проверить право на upgrade
        const canUpgrade = await this.canUpgradeToPartnerPro(userId);
        if (!canUpgrade) {
            throw new Error('User cannot upgrade to Partner Pro (deadline exceeded or already upgraded)');
        }

        const user = await usersStorage.getUserById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Создать запись о покупке Partner Pro
        const packageRecord = await activationPackageStorage.create({
            userId,
            type: 'partner_pro',
            amountRub: '30000.00',
        });

        // Обновить статус
        await usersStorage.updateUser(userId, {
            mlmStatus: 'partner_pro',
            upgradeDeadlineAt: null,
        });

        // Начислить дополнительный активационный бонус рефереру
        if (user.referrerId) {
            await this.grantActivationBonus(user.referrerId, userId, 'partner_pro');
        }

        console.log(`✅ User ${userId} upgraded to Partner Pro`);
        return packageRecord;
    }

    /**
     * Проверка возможности upgrade Partner → Partner Pro
     */
    async canUpgradeToPartnerPro(userId: string): Promise<boolean> {
        return activationPackageStorage.canUpgradeToPartnerPro(userId);
    }

    /**
     * Получить историю пакетов пользователя
     */
    async getUserPackages(userId: string): Promise<ActivationPackage[]> {
        return activationPackageStorage.getByUserId(userId);
    }

    /**
     * Получить последний пакет пользователя
     */
    async getLatestPackage(userId: string): Promise<ActivationPackage | null> {
        return activationPackageStorage.getLatestByUserId(userId);
    }

    /**
     * Начислить активационный бонус рефереру
     * Registry.md 4.6: 750 RUB за Partner, 1250 RUB за Partner Pro
     */
    private async grantActivationBonus(
        referrerId: string,
        inviteeId: string,
        packageType: 'partner' | 'partner_pro'
    ): Promise<void> {
        const bonusAmount = packageType === 'partner' ? 750 : 1250;

        try {
            // Получить referrer
            const referrer = await usersStorage.getUserById(referrerId);
            if (!referrer) {
                console.log(`⚠️ Referrer ${referrerId} not found, skip activation bonus`);
                return;
            }


            // Создать idempotency key
            const idempotencyKey = `activation_bonus:${inviteeId}:${packageType}`;

            // Получить системный счёт и счёт referrer
            const system = await ledgerStorage.ensureAccount(null, 'RUB', 'cash_rub', 'system');
            const userAcc = await ledgerStorage.ensureAccount(referrerId, 'RUB', 'cash_rub', 'user');

            // Создать транзакцию
            await ledgerStorage.createPosting({
                debitAccountId: userAcc.id,
                creditAccountId: system.id,
                amount: bonusAmount,
                currency: 'RUB',
                opType: 'activation_bonus',
                userId: referrerId,
                memo: `Activation bonus for ${packageType}`,
                meta: {}
            });

            console.log(`✅ Granted activation bonus ${bonusAmount} RUB to ${referrerId} for inviting ${inviteeId}`);
        } catch (err: any) {
            // Если ошибка = duplicate idempotency key, то бонус уже начислен
            if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
                console.log(`⚠️ Activation bonus already granted for ${inviteeId}:${packageType}`);
                return;
            }

            console.error(`❌ Failed to grant activation bonus:`, err);
            // Не бросаем ошибку, чтобы не блокировать покупку пакета
        }
    }

    /**
     * Получить все пакеты (для админки)
     */
    async getAllPackages(limit = 100, offset = 0): Promise<ActivationPackage[]> {
        return activationPackageStorage.getAll(limit, offset);
    }

    /**
     * Получить статистику по пакетам
     */
    async getPackageStats(): Promise<{
        partner: number;
        partnerPro: number;
        total: number;
    }> {
        const partner = await activationPackageStorage.countByType('partner');
        const partnerPro = await activationPackageStorage.countByType('partner_pro');

        return {
            partner,
            partnerPro,
            total: partner + partnerPro,
        };
    }
}

export const activationPackageService = new ActivationPackageService();
