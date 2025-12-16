// tests/activation/package.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { activationPackageService } from '../../src/services/activationPackageService';
import { usersStorage } from '../../src/storage/usersStorage';
import * as activationPackageStorage from '../../src/storage/activationPackageStorage';
import { db } from '../../src/db';
import { appUser } from '../../src/db/schema';

describe('ActivationPackageService', () => {
    let testUserId: string;
    let referrerId: string;

    beforeEach(async () => {
        // Очистить таблицы
        await db.delete(appUser);

        // Создать тестового пользователя (customer)
        const user = await usersStorage.createUser({
            telegramId: `test_${Date.now()}`,
            firstName: 'Test',
            lastName: 'User',
            mlmStatus: 'customer',
            referralCode: `REF${Date.now()}`,
        });
        testUserId = user.id;

        // Создать реферера
        const referrer = await usersStorage.createUser({
            telegramId: `ref_${Date.now()}`,
            firstName: 'Referrer',
            lastName: 'User',
            mlmStatus: 'partner',
            referralCode: `REF${Date.now() + 1}`,
        });
        referrerId = referrer.id;

        // Привязать реферера к пользователю
        await usersStorage.updateUser(testUserId, {
            referrerId,
        });
    });

    describe('purchasePartnerPackage', () => {
        it('should create Partner package (7500 RUB)', async () => {
            const pkg = await activationPackageService.purchasePartnerPackage(testUserId);

            expect(pkg).toBeDefined();
            expect(pkg.userId).toBe(testUserId);
            expect(pkg.type).toBe('partner');
            expect(pkg.amountRub).toBe('7500.00');
        });

        it('should update user mlm_status to partner', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);

            const user = await usersStorage.getUserById(testUserId);
            expect(user?.mlmStatus).toBe('partner');
            expect(user?.activatedAt).toBeDefined();
            expect(user?.upgradeDeadlineAt).toBeDefined();
        });

        it('should set upgrade deadline to 5 weeks', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);

            const user = await usersStorage.getUserById(testUserId);
            if (!user?.activatedAt || !user?.upgradeDeadlineAt) {
                throw new Error('activatedAt or upgradeDeadlineAt not set');
            }

            const activatedAt = new Date(user.activatedAt);
            const upgradeDeadline = new Date(user.upgradeDeadlineAt);
            const weeksDiff = Math.floor(
                (upgradeDeadline.getTime() - activatedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
            );

            expect(weeksDiff).toBe(5);
        });

        it('should throw error if user already has Partner package', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);

            await expect(
                activationPackageService.purchasePartnerPackage(testUserId)
            ).rejects.toThrow('already has Partner package');
        });

        it('should throw error if user is not customer', async () => {
            await usersStorage.updateUser(testUserId, { mlmStatus: 'partner' });

            await expect(
                activationPackageService.purchasePartnerPackage(testUserId)
            ).rejects.toThrow('already has status');
        });
    });

    describe('purchasePartnerProPackage', () => {
        it('should create Partner Pro package (30000 RUB)', async () => {
            const pkg = await activationPackageService.purchasePartnerProPackage(testUserId);

            expect(pkg).toBeDefined();
            expect(pkg.userId).toBe(testUserId);
            expect(pkg.type).toBe('partner_pro');
            expect(pkg.amountRub).toBe('30000.00');
        });

        it('should update user mlm_status to partner_pro', async () => {
            await activationPackageService.purchasePartnerProPackage(testUserId);

            const user = await usersStorage.getUserById(testUserId);
            expect(user?.mlmStatus).toBe('partner_pro');
            expect(user?.activatedAt).toBeDefined();
        });
    });

    describe('upgradeToPartnerPro', () => {
        it('should upgrade Partner to Partner Pro within 5 weeks', async () => {
            // Купить Partner
            await activationPackageService.purchasePartnerPackage(testUserId);

            // Upgrade
            const pkg = await activationPackageService.upgradeToPartnerPro(testUserId);

            expect(pkg.type).toBe('partner_pro');

            const user = await usersStorage.getUserById(testUserId);
            expect(user?.mlmStatus).toBe('partner_pro');
        });

        it('should throw error if deadline exceeded', async () => {
            // Купить Partner
            await activationPackageService.purchasePartnerPackage(testUserId);

            // Установить activatedAt на 6 недель назад
            const sixWeeksAgo = new Date();
            sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 6 * 7);

            await usersStorage.updateUser(testUserId, {
                activatedAt: sixWeeksAgo,
            });

            // Upgrade должен провалиться
            await expect(
                activationPackageService.upgradeToPartnerPro(testUserId)
            ).rejects.toThrow('cannot upgrade');
        });

        it('should throw error if already Partner Pro', async () => {
            await activationPackageService.purchasePartnerProPackage(testUserId);

            await expect(
                activationPackageService.upgradeToPartnerPro(testUserId)
            ).rejects.toThrow('cannot upgrade');
        });
    });

    describe('canUpgradeToPartnerPro', () => {
        it('should return true within 5 weeks', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);

            const canUpgrade = await activationPackageService.canUpgradeToPartnerPro(testUserId);
            expect(canUpgrade).toBe(true);
        });

        it('should return false after 5 weeks', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);

            // Установить activatedAt на 6 недель назад
            const sixWeeksAgo = new Date();
            sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 6 * 7);

            await usersStorage.updateUser(testUserId, {
                activatedAt: sixWeeksAgo,
            });

            const canUpgrade = await activationPackageService.canUpgradeToPartnerPro(testUserId);
            expect(canUpgrade).toBe(false);
        });

        it('should return false if not Partner', async () => {
            const canUpgrade = await activationPackageService.canUpgradeToPartnerPro(testUserId);
            expect(canUpgrade).toBe(false);
        });
    });

    describe('getUserPackages', () => {
        it('should return all packages for user', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);

            const packages = await activationPackageService.getUserPackages(testUserId);
            expect(packages).toHaveLength(1);
            expect(packages[0].type).toBe('partner');
        });

        it('should return multiple packages after upgrade', async () => {
            await activationPackageService.purchasePartnerPackage(testUserId);
            await activationPackageService.upgradeToPartnerPro(testUserId);

            const packages = await activationPackageService.getUserPackages(testUserId);
            expect(packages).toHaveLength(2);
            expect(packages.map((p) => p.type)).toContain('partner');
            expect(packages.map((p) => p.type)).toContain('partner_pro');
        });
    });

    describe('getPackageStats', () => {
        it('should return correct stats', async () => {
            // Создать несколько пользователей с пакетами
            const user2 = await usersStorage.createUser({
                telegramId: `test2_${Date.now()}`,
                firstName: 'Test2',
                mlmStatus: 'customer',
                referralCode: `REF${Date.now() + 2}`,
            });

            await activationPackageService.purchasePartnerPackage(testUserId);
            await activationPackageService.purchasePartnerProPackage(user2.id);

            const stats = await activationPackageService.getPackageStats();
            expect(stats.partner).toBeGreaterThanOrEqual(1);
            expect(stats.partnerPro).toBeGreaterThanOrEqual(1);
            expect(stats.total).toBe(stats.partner + stats.partnerPro);
        });
    });
});
