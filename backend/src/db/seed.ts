/**
 * Idempotent Seed Script
 * 
 * This script ensures required seed data exists without overwriting existing data.
 * Safe to run multiple times and in CI/CD pipelines.
 * 
 * Usage:
 *   npm run seed           - Run idempotent seed (default, safe for production)
 *   npm run seed:fresh     - Clean and reseed (dev only, destructive!)
 */

import bcrypt from "bcrypt";
import { db } from "#db/db";
import { eq, sql } from "drizzle-orm";

import {
    appUser,
    category,
    product,
    uploadedMedia,
    promoCode,
    airdropTask,
    achievement,
    order,
    orderItem,
    payment,
    ledgerAccount,
    withdrawalRequest,
    address,
    levelsMatrixVersions,
    settlementSettings,
} from "#db/schema";
import type { NewAppUser } from "#db/schema/users";

// ─────────────────────────────────────────────────────────────────────────────
// Constants: Seed User IDs (RFC 4122 compliant UUIDs)
// ─────────────────────────────────────────────────────────────────────────────

const SEED_ADMIN_ID = "64f44359-aa83-4497-a113-2980274aeb4c";
const SEED_PARTNER1_ID = "59a13d30-86c5-4a2c-840c-026d5738aaa1";
const SEED_PARTNER2_ID = "875b0a5f-9c7d-45e7-975d-9b913a0ada49";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Check if table has any rows
// ─────────────────────────────────────────────────────────────────────────────

async function tableHasRows(table: any): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(table).limit(1);
    return (result[0]?.count ?? 0) > 0;
}

async function recordExists(table: any, field: any, value: string): Promise<boolean> {
    const result = await db.select({ id: table.id }).from(table).where(eq(field, value)).limit(1);
    return result.length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Functions (Idempotent)
// ─────────────────────────────────────────────────────────────────────────────

async function seedSettlementSettings(): Promise<void> {
    const hasSettings = await tableHasRows(settlementSettings);

    if (hasSettings) {
        console.log("⏭️  Settlement settings already exist, skipping...");
        return;
    }

    await db.insert(settlementSettings).values({
        referralDiscountPercent: '10',
        networkFundPercent: '50',
        vwcCashbackPercent: '5',
        freeShippingThresholdRub: '7500',
        deliveryBasePriceRub: '0',
        pvRubPerPv: '200',
        roundingMoney: 'half_up',
        roundingPv: 'floor',
        calcTimezone: 'Europe/Moscow',
        isCompressionEnabled: false,
        fastStartWeeks: 8,
        fastStartStartPoint: 'activation',
        infinityRate: '0.0025',
        optionBonusPercent: '3',
        isActive: true,
    });

    console.log("✅ Settlement settings created");
}

async function seedAdminUser(): Promise<void> {
    // Check if admin exists by email or ID
    const adminExists = await recordExists(appUser, appUser.email, "admin@vitawin.com");

    if (adminExists) {
        console.log("⏭️  Admin user already exists, skipping...");
        return;
    }

    const passwordHash = await bcrypt.hash("admin", 10);

    const adminUser: NewAppUser = {
        id: SEED_ADMIN_ID,
        telegramId: "90001",
        username: "admin",
        firstName: "Admin",
        lastName: "Главный",
        email: "admin@vitawin.com",
        phone: "+79990000001",
        passwordHash,
        referralCode: "ADMIN",
        appliedReferralCode: null,
        mlmStatus: "partner",
        rank: "создатель",
        isAdmin: true,
        isActive: true,
        referrerId: null,
        option3Enabled: false,
        freedomShares: [25, 25, 25, 25],
    };

    try {
        await db.insert(appUser).values(adminUser);
        console.log("✅ Admin user created (email: admin@vitawin.com, password: admin)");
    } catch (e: any) {
        // Handle unique constraint violation gracefully
        if (e.code === '23505') {
            console.log("⏭️  Admin user already exists (constraint), skipping...");
        } else {
            throw e;
        }
    }
}

async function seedTestPartners(): Promise<void> {
    // Skip test partners in production
    if (process.env.NODE_ENV === 'production') {
        console.log("⏭️  Skipping test partners in production...");
        return;
    }

    const passwordHash = await bcrypt.hash("user", 10);

    const partners: NewAppUser[] = [
        {
            id: SEED_PARTNER1_ID,
            telegramId: "90002",
            username: "partner1",
            firstName: "Партнер",
            lastName: "Амбассадор",
            email: "partner1@test.com",
            phone: "+79990000002",
            passwordHash,
            referralCode: "PARTNER1",
            appliedReferralCode: "ADMIN",
            mlmStatus: "partner",
            rank: "лидер",
            isAdmin: false,
            isActive: true,
            referrerId: SEED_ADMIN_ID,
            option3Enabled: false,
            freedomShares: [25, 25, 25, 25],
        },
        {
            id: SEED_PARTNER2_ID,
            telegramId: "90003",
            username: "partner2",
            firstName: "Партнер",
            lastName: "Бизнес",
            email: "partner2@test.com",
            phone: "+79990000003",
            passwordHash,
            referralCode: "PARTNER2",
            appliedReferralCode: "ADMIN",
            mlmStatus: "partner",
            rank: "member",
            isAdmin: false,
            isActive: true,
            referrerId: SEED_ADMIN_ID,
            option3Enabled: false,
            freedomShares: [25, 25, 25, 25],
        }
    ];

    for (const partner of partners) {
        const exists = await recordExists(appUser, appUser.email, partner.email!);
        if (exists) {
            console.log(`⏭️  Partner ${partner.username} already exists, skipping...`);
            continue;
        }

        try {
            await db.insert(appUser).values(partner);
            console.log(`✅ Partner ${partner.username} created`);
        } catch (e: any) {
            if (e.code === '23505') {
                console.log(`⏭️  Partner ${partner.username} already exists (constraint), skipping...`);
            } else {
                throw e;
            }
        }
    }
}

async function seedDefaultCategory(): Promise<string | null> {
    const exists = await recordExists(category, category.slug, "vitamins");

    if (exists) {
        console.log("⏭️  Default category already exists, skipping...");
        const [cat] = await db.select({ id: category.id }).from(category).where(eq(category.slug, "vitamins")).limit(1);
        return cat?.id ?? null;
    }

    const [cat] = await db
        .insert(category)
        .values({
            name: "Витамины",
            slug: "vitamins",
            description: "Категория: витамины",
            status: "active",
        })
        .returning({ id: category.id });

    console.log("✅ Default category created");
    return cat?.id ?? null;
}

async function seedDemoProduct(categoryId: string | null): Promise<void> {
    // Skip demo products in production
    if (process.env.NODE_ENV === 'production') {
        console.log("⏭️  Skipping demo products in production...");
        return;
    }

    if (!categoryId) {
        console.log("⚠️  No category ID, skipping demo product...");
        return;
    }

    const exists = await recordExists(product, product.slug, "vitamin-c");

    if (exists) {
        console.log("⏭️  Demo product already exists, skipping...");
        return;
    }

    // Seed media first
    const mediaExists = await recordExists(uploadedMedia, uploadedMedia.publicId, "products/vitamin-c-main");
    if (!mediaExists) {
        await db.insert(uploadedMedia).values({
            publicId: "products/vitamin-c-main",
            url: "https://res.cloudinary.com/demo/image/upload/v1/products/vitamin-c-main.jpg",
            format: "jpg",
            width: 1200,
            height: 1200,
            bytes: 200000,
        });
    }

    await db.insert(product).values({
        name: "Vitamin C",
        slug: "vitamin-c",
        description: "Описание витамина C",
        price: "1990.00",
        stock: 100,
        categoryId,
        isPvEligible: true,
        customPv: 30,
        images: [
            {
                mediaId: "products/vitamin-c-main",
                url: "https://res.cloudinary.com/demo/image/upload/v1/products/vitamin-c-main.jpg",
                role: "main",
                alt: "Vitamin C",
                sortOrder: 0,
            },
        ],
        status: "active",
        uiStatus: "active",
    });

    console.log("✅ Demo product created");
}

// ─────────────────────────────────────────────────────────────────────────────
// Fresh Seed (Destructive - Dev Only)
// ─────────────────────────────────────────────────────────────────────────────

async function freshSeed(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        console.error("❌ FATAL: Cannot run fresh seed in production!");
        process.exit(1);
    }

    console.log("🧹 Cleaning database (DEV MODE)...\n");

    await db.delete(orderItem);
    await db.delete(order);
    await db.delete(payment);
    await db.delete(ledgerAccount);
    await db.delete(withdrawalRequest);
    await db.delete(address);
    await db.delete(product);
    await db.delete(uploadedMedia);
    await db.delete(category);
    await db.delete(levelsMatrixVersions);
    await db.delete(promoCode);
    await db.delete(airdropTask);
    await db.delete(achievement);
    await db.delete(appUser);
    await db.delete(settlementSettings);

    console.log("✅ Database cleaned\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    const isFresh = process.argv.includes('--fresh');
    const env = process.env.NODE_ENV ?? 'development';

    console.log(`\n🌱 VitaWin Seed Script`);
    console.log(`   Environment: ${env}`);
    console.log(`   Mode: ${isFresh ? 'FRESH (destructive)' : 'Idempotent (safe)'}\n`);

    // Fresh mode (dev only)
    if (isFresh) {
        await freshSeed();
    }

    // Run idempotent seeds
    await seedSettlementSettings();
    await seedAdminUser();
    await seedTestPartners();
    const categoryId = await seedDefaultCategory();
    await seedDemoProduct(categoryId);

    console.log("\n🚀 SEED COMPLETED SUCCESSFULLY\n");
}

main().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
