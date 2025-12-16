// backend/src/utils/storageHelpers.ts
/**
 * Shared storage helper functions used across multiple storage files
 * Consolidated to maintain DRY principle while preserving exact business logic
 */

/**
 * Ensures a value exists, throws if undefined
 * Used extensively in storage layer for asserting query results
 */
export function must<T>(row: T | undefined, msg = 'Row not found'): T {
    if (row === undefined) throw new Error(msg);
    return row;
}

/**
 * Converts number/string to PostgreSQL NUMERIC string format
 * Handles money fields with 2 decimal precision
 * @param v - Value to convert (number, string, null, or undefined)
 * @returns Formatted string or null/undefined
 */
export function toPgMoney(v: number | string | null | undefined): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    return typeof v === 'number' ? v.toFixed(2) : v;
}

/**
 * Normalizes cashback percentage values
 * Converts decimal (0..1) to percent (0..100) if needed
 * @param v - Percentage value (can be 0..1 or 0..100)
 * @returns Normalized percentage (0..100) or null/undefined
 */
export function normalizeCashbackPercent(v: number | null | undefined): number | null | undefined {
    if (v == null) return v;
    return v <= 1 ? v * 100 : v; // 0.1 -> 10%
}

/**
 * Converts Russian/Cyrillic text to URL-safe slug
 * Preserves Cyrillic characters, replaces spaces with hyphens
 * @param src - Source string to slugify
 * @returns URL-safe slug
 */
export function slugify(src: string): string {
    return src
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes numeric fields in order objects to strings
 * Required for PostgreSQL NUMERIC column compatibility
 * @param patch - Partial order object with numeric fields
 * @returns Same object with numeric fields as strings
 */
export function normalizeOrderNumeric<T extends Record<string, any>>(patch: T): T {
    const out: any = { ...patch };
    const numericFields = [
        'itemsSubtotalRub',
        'discountTotalRub',
        'orderBaseRub',
        'totalPayableRub',
        'deliveryFeeRub',
        'networkFundRub',
        'vwcCashback',
    ] as const;

    numericFields.forEach((k) => {
        if (out[k] != null) out[k] = String(out[k]);
    });
    return out;
}

/**
 * Gets current timestamp
 * Centralized for consistent date handling across storage
 */
export function now(): Date {
    return new Date();
}
