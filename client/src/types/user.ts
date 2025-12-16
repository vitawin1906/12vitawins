// client/src/types/user.ts

export type MlmStatus = 'customer' | 'partner' | 'partner_pro';

/**
 * Canonical User type for the client app (camelCase fields).
 * All backend snake_case keys are normalized to camelCase in baseQuery.
 */
export interface User {
  id: string;
  email?: string | null;
  telegramId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  phone?: string | null;

  // Roles/flags
  isAdmin: boolean;
  isActive: boolean;

  // MLM
  mlmStatus: MlmStatus; // required
  rank?: string | null;

  // Referral
  referralCode?: string | null;
  appliedReferralCode?: string | null;
  referrerId?: string | null;

  // Financials
  balance?: number | string | null;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User Network Statistics from backend /api/users/me/stats
 * Содержит полную информацию о MLM сети пользователя
 */
export interface UserNetworkStats {
  userId: string;
  firstName: string | null;
  username: string | null;
  telegramId: string;
  referralCode: string;
  currentLevel: number;

  personalVolume: {
    totalAmount: number;
    totalPV: number;
    ordersCount: number;
  };

  groupVolume: {
    totalAmount: number;
    totalPV: number;
    ordersCount: number;
  };

  network: {
    totalReferrals: number;
    directReferrals: number;
    levelBreakdown: Record<number, number>;
    maxDepth: number;
  };

  earnings: {
    totalEarned: number;
    referralBonuses: number;  // L1 - бонусы с прямых рефералов
    levelBonuses: number;     // L2+ - бонусы с глубоких уровней
    fastStartBonus: number;   // FastStart бонус (первые 8 недель)
    infinityBonus: number;    // Infinity бонус (глубокие уровни)
    option3Bonus: number;     // Option3 бонус (только partner_pro)
  };
}
