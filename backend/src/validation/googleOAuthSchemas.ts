// backend/src/validation/googleOAuthSchemas.ts
import { z } from 'zod';

/**
 * Схема для логина через Google (ID Token flow)
 */
export const googleLoginSchema = z.object({
    idToken: z.string().min(1, 'ID token is required'),
    refCode: z.string().optional(),
});

/**
 * Схема для привязки Google-аккаунта
 */
export const linkGoogleAccountSchema = z.object({
    idToken: z.string().min(1, 'ID token is required'),
});

/**
 * Схема для callback-а (Authorization Code Flow)
 */
export const googleCallbackSchema = z.object({
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().optional(),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type LinkGoogleAccountInput = z.infer<typeof linkGoogleAccountSchema>;
export type GoogleCallbackInput = z.infer<typeof googleCallbackSchema>;
