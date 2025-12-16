// backend/drizzle/schema/index.ts

// ─── Enums & common helpers ───────────────────────────────────────────────────
export * from './enums';
export * from './_common';

// ─── Core entities ─────────────────────────────────────────────────────────────
export { appUser } from './users';
export { address } from './addresses';

// Network (держим отдельно, чтобы не дублировать с users.ts)
export { networkEdge } from './network';
export { matrixPlacement } from './matrixPlacement';

// Catalog
export { category } from './categories';
export { product } from './products';

// Promotions
export { promotion, promotionProduct } from './promotions';

// Blog & Media
export { blogPosts } from './blog';
export { uploadedMedia } from './media';

// Orders & Payments
export { order } from './orders';
// Если добавишь таблицу позиций заказа в отдельном файле — раскомментируй:
export { orderItem } from './orderItem';

export { payment } from './payments';

// Promo codes
export { promoCode, promoCodeUsage } from './promoCodes';

// export { deliveryEvent } from './delivery_events';

// System logs & notifications
export { notification, orderLog, userActivityLog, analyticsTag } from './system';

// Ledger
export { ledgerAccount, ledgerTxn, ledgerPosting } from './ledger';

// Levels / Ranks / Settings
export { levelsMatrixVersions } from './levels-matrix';
export { rankRules } from './ranks';
export { settings, adminAuditLog } from './settings';
export { settlementSettings } from './settlementSettings';

// Integrations
export { integrationsConfig } from './integrations';

// RBAC
export { adminUserRole } from './rbac';

// Airdrop & Achievements
export { airdropTask, airdropUserAction, achievement, achievementUser } from './airdrop';

// Withdrawals
export { withdrawalRequest } from './withdrawals';

// Activation Packages
export { activationPackage } from './activationPackage';

// Creator Pool
export { proAssignmentPool } from './proAssignmentPool';

// (если нужно) экспорт типов отдельно:
export type { UploadedMedia, NewUploadedMedia } from "./media";
export * from './userBonusPreferences';