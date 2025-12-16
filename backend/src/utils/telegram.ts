import crypto from "crypto";

export interface TelegramAuthData {
  id: string;
  first_name: string;
  username?: string | undefined;
  photo_url?: string | undefined;
  auth_date: number;
  hash: string;
}

/**
 * Verifies Telegram authentication data according to official Telegram documentation
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export async function verifyTelegramAuth(authData: TelegramAuthData): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN environment variable is not set");
      return false;
    }

    const { hash, ...data } = authData;

    // Create data string for verification
    const dataCheckString = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key as keyof typeof data]}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify signature matches
    if (signature !== hash) {
      console.error("Telegram auth signature verification failed");
      return false;
    }

    // Check if auth_date is not too old (24 hours max)
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 86400; // 24 hours in seconds

    if (currentTime - authData.auth_date > maxAge) {
      console.error("Telegram auth data is too old");
      return false;
    }

    return true;

  } catch (error) {
    console.error("Error verifying Telegram auth:", error);
    return false;
  }
}

/**
 * Generates a secure hash for Telegram authentication verification
 * This is used internally by the verification process
 */
export function generateTelegramHash(data: Omit<TelegramAuthData, 'hash'>, botToken: string): string {
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key as keyof typeof data]}`)
    .join('\n');

  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest();

  return crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
}

/**
 * Validates the structure and types of Telegram auth data
 */
export function validateTelegramAuthData(data: any): data is TelegramAuthData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields
  if (typeof data.id !== 'number' || data.id <= 0) {
    return false;
  }

  if (typeof data.first_name !== 'string' || data.first_name.length === 0) {
    return false;
  }

  if (typeof data.auth_date !== 'number' || data.auth_date <= 0) {
    return false;
  }

  if (typeof data.hash !== 'string' || data.hash.length === 0) {
    return false;
  }

  // Optional fields
  if (data.username !== undefined && typeof data.username !== 'string') {
    return false;
  }

  if (data.photo_url !== undefined && typeof data.photo_url !== 'string') {
    return false;
  }

  return true;
}

/**
 * Extracts user information from verified Telegram auth data
 */
export function extractUserInfo(authData: TelegramAuthData) {
  return {
    telegram_id: authData.id,
    first_name: authData.first_name,
    username: authData.username || null,
    photo_url: authData.photo_url || null,
  };
}

/**
 * Checks if the provided bot token format is valid
 */
export function isValidBotToken(token: string): boolean {
  // Telegram bot tokens follow the format: <bot_id>:<bot_secret>
  // bot_id is a number, bot_secret is a 35-character alphanumeric string
  const tokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
  return tokenRegex.test(token);
}

/**
 * Creates a mock Telegram auth data for testing purposes
 * WARNING: This should only be used in development/testing environments
 */
export function createMockTelegramAuth(userId: string, firstName: string, username?: string): TelegramAuthData {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("Mock Telegram auth cannot be used in production");
  }

  const authDate = Math.floor(Date.now() / 1000);
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "mock_bot_token";
  
  const base = {
    id: userId,
    first_name: firstName,
    auth_date: authDate,
  } as const;

  const data: Omit<TelegramAuthData, 'hash'> =
    username !== undefined && username !== null
      ? { ...base, username }
      : base;

  const hash = generateTelegramHash(data, botToken);

  return {
    ...data,
    hash,
  };
}

/**
 * Logs Telegram auth attempts for debugging and security monitoring
 */
export function logTelegramAuthAttempt(authData: TelegramAuthData, success: boolean, userAgent?: string, ip?: string) {
  const logData = {
    timestamp: new Date().toISOString(),
    telegram_id: authData.id,
    first_name: authData.first_name,
    username: authData.username,
    auth_date: new Date(authData.auth_date * 1000).toISOString(),
    success,
    user_agent: userAgent,
    ip,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log("Telegram auth attempt:", logData);
  }

  // In production, you might want to send this to a logging service
  // or store it in a separate audit log table
}
