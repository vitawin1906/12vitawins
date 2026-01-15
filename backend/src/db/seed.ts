import bcrypt from "bcrypt";
import { db } from "#db/db";

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


async function main() {
    console.log("🌱 Starting SEED...\n");

    /* ============================================================
     * CLEAN DATABASE
     * ============================================================ */
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

    console.log("🧹 DB cleaned");

    /* ============================================================
     * USERS
     * ============================================================ */

    const passwordAdmin = await bcrypt.hash("admin", 10);
    const passwordUser = await bcrypt.hash("user", 10);

    const users: NewAppUser[] = [
        {
            id: "00000000-0000-0000-0000-000000000001",
            telegramId: "90001",
            username: "admin",
            firstName: "Admin",
            lastName: "Главный",
            email: "admin@vitawin.com",
            phone: "+79990000001",
            passwordHash: passwordAdmin,
            referralCode: "ADMIN",
            appliedReferralCode: null,
            mlmStatus: "partner", // ENUM
            rank: "создатель",    // ENUM
            isAdmin: true,
            isActive: true,
            referrerId: null,
            option3Enabled: false,
            freedomShares: [25, 25, 25, 25],
        },
        {
            id: "00000000-0000-0000-0000-000000000002",
            telegramId: "90002",
            username: "partner1",
            firstName: "Партнер",
            lastName: "Амбассадор",
            email: "partner1@test.com",
            phone: "+79990000002",
            passwordHash: passwordUser,
            referralCode: "PARTNER1",
            appliedReferralCode: "ADMIN",
            mlmStatus: "partner",
            rank: "лидер",
            isAdmin: false,
            isActive: true,
            referrerId: null,
            option3Enabled: false,
            freedomShares: [25, 25, 25, 25],
        },
        {
            id: "00000000-0000-0000-0000-000000000003",
            telegramId: "90003",
            username: "partner2",
            firstName: "Партнер",
            lastName: "Бизнес",
            email: "partner2@test.com",
            phone: "+79990000003",
            passwordHash: passwordUser,
            referralCode: "PARTNER2",
            appliedReferralCode: "ADMIN",
            mlmStatus: "partner",
            rank: "member",
            isAdmin: false,
            isActive: true,
            referrerId: null,
            option3Enabled: false,
            freedomShares: [25, 25, 25, 25],
        }
    ];

    await db.insert(appUser).values(users);
    console.log("👤 Users created");

    /* ============================================================
     * LEVELS MATRIX VERSION
     * ============================================================ */

    const LEVELS = [
        0.30, 0.20, 0.15, 0.10, 0.06,
        0.04, 0.03, 0.02, 0.01, 0.01,
        0.01, 0, 0, 0, 0,
    ];

    const FAST = [
        0.40, 0.30, 0.15, 0.08, 0.07,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
    ];


    console.log("📊 Matrix version created");

    /* ============================================================
     * SETTLEMENT SETTINGS
     * ============================================================ */

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

    console.log("⚙️ Settlement settings created");

    /* ============================================================
     * CATEGORY
     * ============================================================ */

    const [cat] = await db
        .insert(category)
        .values({
            name: "Витамины",
            slug: "vitamins",
            description: "Категория: витамины",
            status: "active",
        })
        .returning({ id: category.id });

    if (!cat) throw new Error("Category not created");

    console.log("📦 Category created");

    /* ============================================================
     * MEDIA
     * ============================================================ */

    await db.insert(uploadedMedia).values({
        publicId: "products/vitamin-c-main",
        url: "https://res.cloudinary.com/demo/image/upload/v1/products/vitamin-c-main.jpg",
        format: "jpg",
        width: 1200,
        height: 1200,
        bytes: 200000,
    });

    /* ============================================================
     * PRODUCT
     * ============================================================ */

    await db.insert(product).values({
        name: "Vitamin C",
        slug: "vitamin-c",
        description: "Описание витамина C",
        price: "1990.00",
        stock: 100,
        categoryId: cat.id, // фиксировано
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

    console.log("🛍 Product created");

    console.log("\n🚀 SEED COMPLETED SUCCESSFULLY");
}

main().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
