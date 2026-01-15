import { db } from '#db/db';
import { eq } from 'drizzle-orm';
import { settlementSettings } from "#db/schema";

/**
 * Runtime-кэш активной конфигурации расчётов.
 * При запуске приложения подгружается 1 активная запись.
 */
export interface SettlementRuntime {
    referralDiscountPercent: number;
    networkFundPercent: number;
    vwcCashbackPercent: number;
    freeShippingThresholdRub: number;
    deliveryBasePriceRub: number;
    pvRubPerPv: number;
    roundingMoney: 'half_up' | 'half_even';
    roundingPv: 'floor' | 'round';
    // Referral level percents
    referralLevel1Percent: number;
    referralLevel2Percent: number;
    referralLevel3Percent: number;
}

export let settlementSettingsRuntime: SettlementRuntime = {
    referralDiscountPercent: 10,
    networkFundPercent: 50,
    vwcCashbackPercent: 5,
    freeShippingThresholdRub: 7500,
    deliveryBasePriceRub: 0,
    pvRubPerPv: 200,
    roundingMoney: 'half_up',
    roundingPv: 'floor',
    referralLevel1Percent: 20,
    referralLevel2Percent: 5,
    referralLevel3Percent: 1,
};

/**
 * Подгрузить активную запись settlement_settings
 * (используется при старте сервера)
 * Если записи нет — создаёт её с дефолтными значениями.
 */
export async function loadSettlementSettings() {
    try {
        const [active] = await db
            .select()
            .from(settlementSettings)
            .where(eq(settlementSettings.isActive, true))
            .limit(1);

        if (active) {
            settlementSettingsRuntime = {
                referralDiscountPercent: Number(active.referralDiscountPercent),
                networkFundPercent: Number(active.networkFundPercent),
                vwcCashbackPercent: Number(active.vwcCashbackPercent),
                freeShippingThresholdRub: Number(active.freeShippingThresholdRub),
                deliveryBasePriceRub: Number(active.deliveryBasePriceRub),
                pvRubPerPv: Number(active.pvRubPerPv),
                roundingMoney: active.roundingMoney as 'half_up' | 'half_even',
                roundingPv: active.roundingPv as 'floor' | 'round',
                referralLevel1Percent: Number((active as any).referralLevel1Percent ?? 20),
                referralLevel2Percent: Number((active as any).referralLevel2Percent ?? 5),
                referralLevel3Percent: Number((active as any).referralLevel3Percent ?? 1),
            };
            console.log('✅ Loaded settlement_settings from DB:', settlementSettingsRuntime);
        } else {
            // Создаём дефолтную запись если нет ни одной активной
            console.log('⚠️ No active settlement_settings found, creating default...');
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
            console.log('✅ Created default settlement_settings, using defaults:', settlementSettingsRuntime);
        }
    } catch (error) {
        console.error('❌ Failed to load settlement_settings:', error);
        console.log('⚠️ Using in-memory default settlement_settings:', settlementSettingsRuntime);
        // Не выбрасываем ошибку - используем дефолтные значения
    }
}

