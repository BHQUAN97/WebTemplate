import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption helpers — dung de ma hoa sensitive data at rest
 * (vi du: 2FA secret, OAuth refresh token nha cung cap thu 3).
 *
 * Format ciphertext output: base64(iv[12] || authTag[16] || ciphertext[n])
 *
 * Key phai la hex string 64 ky tu (32 bytes). Sinh bang:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — chuan khuyen nghi cho GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Convert hex key string thanh Buffer 32 bytes. Throw neu key khong hop le.
 */
function resolveKey(keyHex: string): Buffer {
  if (!keyHex || typeof keyHex !== 'string') {
    throw new Error(
      '[crypto.util] Encryption key is missing or not a string',
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('[crypto.util] Encryption key must be a hex string');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `[crypto.util] Invalid encryption key length (got ${key.length} bytes, must be 32 bytes = 64 hex chars)`,
    );
  }
  return key;
}

/**
 * Encrypt plaintext voi AES-256-GCM. Tra ve chuoi base64 chua iv + authTag + ciphertext.
 *
 * @param plaintext Chuoi can ma hoa (UTF-8)
 * @param keyHex Hex string 64 ky tu (32 bytes)
 * @returns base64-encoded ciphertext
 */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = resolveKey(keyHex);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt ciphertext duoc tao boi encrypt(). Throw neu auth tag khong khop
 * (bi sua doi) hoac key sai.
 */
export function decrypt(ciphertext: string, keyHex: string): string {
  const key = resolveKey(keyHex);
  const buf = Buffer.from(ciphertext, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('[crypto.util] Ciphertext too short / corrupted');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generate a cryptographically secure random token bang hex format.
 * Dung cho backup codes, invitation tokens, ...
 */
export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}
