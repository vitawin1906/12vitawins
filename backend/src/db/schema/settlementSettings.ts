// backend/drizzle/schema/settlement_settings.ts
import {
    pgTable, serial, numeric, boolean, integer, text, index, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAtCol, updatedAtCol } from './_common';
import { fastStartPointEnum } from './enums';

export const settlementSettings = pgTable('settlement_settings', {
    id: serial('id').primaryKey(),

    // Базовые параметры
    referralDiscountPercent: numeric('referral_discount_percent', { precision: 5, scale: 2 }).notNull().default('10'),
    networkFundPercent:     numeric('network_fund_percent',       { precision: 5, scale: 2 }).notNull().default('50'),
    vwcCashbackPercent:     numeric('vwc_cashback_percent',       { precision: 5, scale: 2 }).notNull().default('5'),

    // Доставка
    freeShippingThresholdRub: numeric('free_shipping_threshold_rub', { precision: 12, scale: 2 }).notNull().default('7500'),
    deliveryBasePriceRub:     numeric('delivery_base_price_rub',     { precision: 12, scale: 2 }).notNull().default('0'),

    pvRubPerPv: numeric('pv_rub_per_pv', { precision: 12, scale: 2 })
        .notNull()
        .default('200'),

    // Округления / TZ / компрессия
    roundingMoney: text('rounding_money').notNull().default('half_up'), // 'half_up' (денежные)
    roundingPv:    text('rounding_pv').notNull().default('floor'),      // 'floor'   (PV)
    calcTimezone:  text('calc_timezone').notNull().default('Europe/Moscow'),
    isCompressionEnabled: boolean('is_compression_enabled').notNull().default(false),

    // Fast Start / Infinity / Опцион 3%
    fastStartWeeks: integer('fast_start_weeks').notNull().default(8),
    fastStartStartPoint: fastStartPointEnum('fast_start_start_point').notNull().default('activation'),
    infinityRate: numeric('infinity_rate', { precision: 6, scale: 4 }).notNull().default('0.0025'), // 0.25%
    optionBonusPercent: numeric('option_bonus_percent', { precision: 5, scale: 2 }).notNull().default('3'),

    // Версионирование
    isActive: boolean('is_active').notNull().default(true),

    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
}, (t) => ({
    // Единственная активная запись
    uxActive: uniqueIndex('ux_settlement_settings_active')
        .on(t.isActive)
        .where(sql`${t.isActive} = true`),

    ixCalcTZ: index('ix_settlement_settings_tz').on(t.calcTimezone),

    // Диапазоны и валидность значений
    chkRefDisc:  check('chk_settle_ref_disc',  sql`${t.referralDiscountPercent} >= 0 AND ${t.referralDiscountPercent} <= 100`),
    chkNetFund:  check('chk_settle_net_fund',  sql`${t.networkFundPercent}     >= 0 AND ${t.networkFundPercent}     <= 100`),
    chkVwcCash:  check('chk_settle_vwc_cash',  sql`${t.vwcCashbackPercent}     >= 0 AND ${t.vwcCashbackPercent}     <= 100`),
    chkOptBonus: check('chk_settle_opt_bonus', sql`${t.optionBonusPercent}     >= 0 AND ${t.optionBonusPercent}     <= 100`),

    chkInfinity: check('chk_settle_infinity',  sql`${t.infinityRate} >= 0 AND ${t.infinityRate} <= 1`),

    chkMoneyNonNeg: check('chk_settle_money_nonneg',
        sql`${t.freeShippingThresholdRub} >= 0 AND ${t.deliveryBasePriceRub} >= 0`),

    chkWeeks: check('chk_settle_fast_weeks',   sql`${t.fastStartWeeks} BETWEEN 1 AND 52`),

    // допускаем только ожидаемые режимы округления (оставил расширяемые наборы)
    chkRoundingMoney: check('chk_settle_rounding_money',
        sql`${t.roundingMoney} IN ('half_up','half_even')`),
    chkRoundingPv: check('chk_settle_rounding_pv',
        sql`${t.roundingPv} IN ('floor','round')`),
}));

export type SettlementSettings = typeof settlementSettings.$inferSelect;
export type NewSettlementSettings = typeof settlementSettings.$inferInsert;
