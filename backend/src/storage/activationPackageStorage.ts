// backend/src/storage/activationPackageStorage.ts
import { eq, and, desc } from 'drizzle-orm';
import { db } from '#db/db';
import { activationPackage, appUser } from '../db/schema';
import type { ActivationPackage, NewActivationPackage } from '../db/schema/activationPackage';

/**
 * Storage layer for activation_package table
 * Registry.md 3.2: Partner (7500) / Partner Pro (30000)
 */

/**
 * Создать новый пакет активации
 */
export async function create(data: NewActivationPackage): Promise<ActivationPackage> {
    const rows = await db
        .insert(activationPackage)
        .values(data)
        .returning();

    const pkg = rows[0];
    if (!pkg) throw new Error('Failed to create activation package');
    return pkg;
}

/**
 * Получить все пакеты пользователя
 */
export async function getByUserId(userId: string): Promise<ActivationPackage[]> {
    return db
        .select()
        .from(activationPackage)
        .where(eq(activationPackage.userId, userId))
        .orderBy(desc(activationPackage.createdAt));
}

/**
 * Получить последний пакет пользователя
 */
export async function getLatestByUserId(userId: string): Promise<ActivationPackage | null> {
    const [pkg] = await db
        .select()
        .from(activationPackage)
        .where(eq(activationPackage.userId, userId))
        .orderBy(desc(activationPackage.createdAt))
        .limit(1);

    return pkg || null;
}

/**
 * Получить пакет по типу для пользователя
 */
export async function getByUserIdAndType(
    userId: string,
    type: 'partner' | 'partner_pro'
): Promise<ActivationPackage | null> {
    const [pkg] = await db
        .select()
        .from(activationPackage)
        .where(
            and(
                eq(activationPackage.userId, userId),
                eq(activationPackage.type, type)
            )
        )
        .orderBy(desc(activationPackage.createdAt))
        .limit(1);

    return pkg || null;
}

/**
 * Проверить, может ли пользователь апгрейдиться до Partner Pro
 * Registry.md 3.2: upgrade разрешён 5 недель от activated_at
 */
export async function canUpgradeToPartnerPro(userId: string): Promise<boolean> {
    // Получить пользователя
    const [user] = await db
        .select()
        .from(appUser)
        .where(eq(appUser.id, userId))
        .limit(1);

    if (!user) return false;

    // Проверить, что статус = partner
    if (user.mlmStatus !== 'partner') return false;

    // Проверить, что activatedAt установлен
    if (!user.activatedAt) return false;

    // Проверить, что прошло не более 5 недель (35 дней)
    const now = new Date();
    const activatedAt = new Date(user.activatedAt);
    const daysPassed = Math.floor((now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const weeksPassed = daysPassed / 7;

    if (weeksPassed > 5) return false;

    // Проверить, что у пользователя нет пакета partner_pro
    const proPackage = await getByUserIdAndType(userId, 'partner_pro');
    if (proPackage) return false;

    return true;
}

/**
 * Получить количество пакетов по типу
 */
export async function countByType(type: 'partner' | 'partner_pro'): Promise<number> {
    const result = await db
        .select({ count: activationPackage.id })
        .from(activationPackage)
        .where(eq(activationPackage.type, type));

    return result.length;
}

/**
 * Проверить, есть ли у пользователя пакет указанного типа
 */
export async function hasPackageType(
    userId: string,
    type: 'partner' | 'partner_pro'
): Promise<boolean> {
    const pkg = await getByUserIdAndType(userId, type);
    return pkg !== null;
}

/**
 * Получить все пакеты (для админки)
 */
export async function getAll(limit = 100, offset = 0): Promise<ActivationPackage[]> {
    return db
        .select()
        .from(activationPackage)
        .orderBy(desc(activationPackage.createdAt))
        .limit(limit)
        .offset(offset);
}
