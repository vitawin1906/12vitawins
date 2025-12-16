// backend/src/services/userBonusPreferencesService.ts
import { userBonusPreferencesStorage, type UserBonusPreferences } from '#storage/userBonusPreferencesStorage';
import { AppError, AppErrorCode } from '../middleware/errorHandler';

/**
 * Business logic for user bonus preferences
 */
export const userBonusPreferencesService = {
    /**
     * Get user preferences, create default if not exists
     */
    async getOrCreatePreferences(userId: string): Promise<UserBonusPreferences> {
        let preferences = await userBonusPreferencesStorage.getByUserId(userId);

        if (!preferences) {
            preferences = await userBonusPreferencesStorage.createDefault(userId);
        }

        return preferences;
    },

    /**
     * Update user bonus distribution preferences
     * Validates that sum equals 100%
     */
    async updatePreferences(
        userId: string,
        percents: {
            healthPercent: number;
            travelPercent: number;
            homePercent: number;
            autoPercent: number;
        }
    ): Promise<UserBonusPreferences> {
        // Validate sum = 100%
        const sum = percents.healthPercent + percents.travelPercent + percents.homePercent + percents.autoPercent;
        if (sum !== 100) {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                `Сумма всех процентов должна равняться 100%, получено ${sum}%`,
                400
            );
        }

        // Validate individual ranges
        const values = Object.values(percents);
        if (values.some(v => v < 0 || v > 100)) {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                'Каждый процент должен быть в диапазоне 0-100%',
                400
            );
        }

        // Check if preferences exist
        const existing = await userBonusPreferencesStorage.getByUserId(userId);

        // Check if locked
        if (existing?.isLocked) {
            throw new AppError(
                AppErrorCode.FORBIDDEN,
                'Настройки заблокированы администратором и не могут быть изменены',
                403
            );
        }

        // Update or create
        if (existing) {
            const updated = await userBonusPreferencesStorage.update(userId, percents);
            if (!updated) {
                throw new AppError(
                    AppErrorCode.NOT_FOUND,
                    'Failed to update preferences',
                    500
                );
            }
            return updated;
        } else {
            return await userBonusPreferencesStorage.create({
                userId,
                ...percents,
                isLocked: false,
            });
        }
    },

    /**
     * Lock or unlock user preferences (admin only)
     */
    async setLocked(userId: string, isLocked: boolean): Promise<UserBonusPreferences> {
        const existing = await userBonusPreferencesStorage.getByUserId(userId);

        if (!existing) {
            throw new AppError(
                AppErrorCode.NOT_FOUND,
                'Настройки пользователя не найдены',
                404
            );
        }

        const updated = await userBonusPreferencesStorage.setLocked(userId, isLocked);

        if (!updated) {
            throw new AppError(
                AppErrorCode.NOT_FOUND,
                'Failed to update lock status',
                500
            );
        }

        return updated;
    },

    /**
     * Get all users preferences with user info (admin)
     */
    async listAllWithUsers() {
        return await userBonusPreferencesStorage.listAllWithUsers();
    },

    /**
     * Calculate bonus distribution for a given amount
     * Returns breakdown by category
     */
    calculateDistribution(
        totalAmount: number,
        preferences: UserBonusPreferences
    ): {
        health: number;
        travel: number;
        home: number;
        auto: number;
    } {
        return {
            health: (totalAmount * preferences.healthPercent) / 100,
            travel: (totalAmount * preferences.travelPercent) / 100,
            home: (totalAmount * preferences.homePercent) / 100,
            auto: (totalAmount * preferences.autoPercent) / 100,
        };
    },
};
