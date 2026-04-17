import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt.
 *
 * @param password - Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a bcrypt hash.
 *
 * @param password - Plain text password
 * @param hash - Bcrypt hash to compare against
 * @returns true if password matches
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate SHA-256 hash of input string.
 * Useful for checksums, cache keys, non-password hashing.
 *
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
