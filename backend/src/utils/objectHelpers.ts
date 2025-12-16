// backend/src/utils/objectHelpers.ts
/**
 * Object manipulation utilities
 * Handles undefined filtering for TypeScript exactOptionalPropertyTypes
 */

/**
 * Filters out undefined values from an object
 * Preserves null values (important for database operations)
 * Solves TypeScript exactOptionalPropertyTypes issues in patch updates
 *
 * @param obj - Object with potentially undefined values
 * @returns New object with undefined values removed
 *
 * @example
 * const patch = filterUndefined({
 *   name: 'Product',
 *   price: 100,
 *   description: undefined,
 *   stock: null
 * });
 * // Returns: { name: 'Product', price: 100, stock: null }
 */
export function filterUndefined<T extends object>(obj: T): {
    [K in keyof T as undefined extends T[K] ? never : K]?: Exclude<T[K], undefined>
} {
    const result: any = {};

    for (const key in obj) {
        const value = obj[key];
        if (value !== undefined) {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Conditionally spreads an object only if condition is true
 * Useful for building patch objects with optional fields
 *
 * @param condition - Whether to include the object
 * @param obj - Object to conditionally spread
 * @returns Object if condition is true, empty object otherwise
 *
 * @example
 * const update = {
 *   name: 'Product',
 *   ...conditionalSpread(hasPrice, { price: 100 }),
 *   ...conditionalSpread(hasStock, { stock: 50 })
 * };
 */
export function conditionalSpread<T extends Record<string, any>>(
    condition: boolean,
    obj: T
): T | Record<string, never> {
    return condition ? obj : {};
}

/**
 * Creates a patch object from body with only defined fields
 * Combines multiple conditional spreads based on field presence
 *
 * @param body - Request body with potential fields
 * @param fields - Array of field names to check
 * @returns Patch object with only defined fields
 *
 * @example
 * const patch = createPatch(req.body, ['name', 'price', 'description']);
 * // Only includes fields that are not undefined in req.body
 */
export function createPatch<T extends Record<string, any>>(
    body: T,
    fields: (keyof T)[]
): Partial<T> {
    const patch: Partial<T> = {};
    for (const field of fields) {
        if (body[field] !== undefined) {
            patch[field] = body[field];
        }
    }
    return patch;
}
