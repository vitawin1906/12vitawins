// src/storage/settingsStorage.ts
import { db } from '#db/db';
import { settings } from '#db/schema/settings';
import { desc, eq } from 'drizzle-orm';
import type { NewSettings, Settings } from '#db/schema/settings';

export const settingsStorage = {
    /** Получить последнюю активную версию настройки по ключу */
    async getActiveValue<T = any>(key: string): Promise<T> {
        const [row] = await db
            .select()
            .from(settings)
            .where(eq(settings.key, key))
            .orderBy(desc(settings.effectiveFrom))
            .limit(1);

        if (!row) throw new Error(`Setting not found: ${key}`);
        return row.valueJson as T;
    },

    /** Добавить новую версию настройки */
    async insertVersion(key: string, valueJson: any): Promise<Settings> {
        const [row] = await db
            .insert(settings)
            .values({
                key,
                valueJson,
                effectiveFrom: new Date(),
            } satisfies NewSettings)
            .returning();

        if (!row) throw new Error(`Failed to insert setting version for key=${key}`);
        return row;
    },

    /** Очистить кэш (заглушка для будущего Redis) */
    invalidateCache(key: string): void {
        console.log(`🧹 Cache invalidated for ${key}`);
    },

    /** Проверить и добавить дефолтные настройки при пустой таблице */
    async ensureDefaults(): Promise<void> {
        const defaults = [
            {
                key: 'levels_matrix',
                valueJson: {
                    sum_mode: 'reserve_7pct',
                    levels: Array(15).fill(0.93 / 15),
                    fast_levels: Array(15).fill(0.93 / 15),
                },
            },
            {
                key: 'discount_priority',
                valueJson: ['line_item', 'cart_fixed', 'cart_percent', 'referral_10'],
            },
            { key: 'vwc_ttl_days', valueJson: null },
            { key: 'free_shipping_threshold_rub', valueJson: 7500 },
            {
                key: 'fast_start',
                valueJson: { window_weeks: 8, first2months_rate: 0.25, later_rate: 0.20 },
            },
            {
                key: 'infinity',
                valueJson: { rate: 0.0025, rank_min: 'создатель', split_rule: '20/80' },
            },
            {
                key: 'option3',
                valueJson: { enabled_default: false, base: 'group_volume_month' },
            },
            {
                key: 'first_pool',
                valueJson: {
                    tiers: [{ threshold_rub: '25000.00', bonus_rub: '5000.00' }],
                    split_rule: '80/20',
                    unique_key: 'leader_id+period+tier',
                },
            },
        ];

        for (const def of defaults) {
            const [exists] = await db.select().from(settings).where(eq(settings.key, def.key)).limit(1);
            if (!exists) {
                await this.insertVersion(def.key, def.valueJson);
                console.log(`⚙️ Default setting inserted: ${def.key}`);
            }
        }
    },
};
