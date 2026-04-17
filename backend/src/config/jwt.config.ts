import { registerAs } from '@nestjs/config';

/**
 * Validate JWT secret — throw neu thieu hoac qua ngan (<32 chars).
 * Bao ve chong viec deploy voi default/yeu secret.
 */
function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[JWT Config] Missing required env variable: ${name}. Please set a strong secret (>=32 chars).`,
    );
  }
  if (value.length < 32) {
    throw new Error(
      `[JWT Config] ${name} is too short (${value.length} chars). Minimum 32 characters required.`,
    );
  }
  return value;
}

/**
 * JWT configuration: access/refresh/reset secrets va expiration times.
 * Tat ca secret phai duoc set qua env; khong co fallback insecure.
 */
export default registerAs('jwt', () => ({
  accessSecret: requireSecret('JWT_ACCESS_SECRET'),
  refreshSecret: requireSecret('JWT_REFRESH_SECRET'),
  resetSecret: requireSecret('JWT_RESET_SECRET'),
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  resetExpires: process.env.JWT_RESET_EXPIRES || '1h',
}));
