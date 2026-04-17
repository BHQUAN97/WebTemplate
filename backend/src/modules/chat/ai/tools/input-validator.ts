/**
 * Input validators cho tool arguments — throw ToolInputError neu invalid.
 *
 * AI co the goi tool voi input lung tung (hallucination, injection attempt).
 * Validator o day:
 *  - Normalize: trim, lowercase neu can
 *  - Length cap: tranh massive string/regex DoS
 *  - Regex whitelist: format ULID, order number, phone, email
 *  - Reject ngay neu vi pham → AI nhan function response { error } va thu lai
 */
import { ToolInputError } from './tool-context.js';

/** ULID: Crockford's base32, 26 chars. */
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
/** Order number: letters + digits + dash, 3-40 chars. */
const ORDER_ID_REGEX = /^[A-Z0-9][A-Z0-9_\-]{2,39}$/i;
/** Phone: VN format. */
const PHONE_REGEX = /^0\d{9,10}$/;
/** Email: khong strict — just a basic sanity check. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_QUERY_LEN = 100;
const MAX_IDENTIFIER_LEN = 100;

export interface NormalizedSearchInput {
  query: string;
  limit: number;
}

export interface NormalizedIdInput {
  id: string;
}

export interface NormalizedOrderSearchInput {
  keyword: string;
  limit: number;
  kind: 'ulid' | 'email' | 'phone' | 'order_number' | 'text';
}

/**
 * Validate + normalize search query input (search_products, search_faq).
 */
export function validateSearchInput(
  query: unknown,
  limit: unknown,
  maxLimit = 10,
): NormalizedSearchInput {
  if (typeof query !== 'string') {
    throw new ToolInputError('query phai la chuoi.');
  }
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new ToolInputError('query khong duoc rong.');
  }
  if (trimmed.length > MAX_QUERY_LEN) {
    throw new ToolInputError(`query qua dai (> ${MAX_QUERY_LEN}).`);
  }
  // Loai bo ky tu LIKE wildcard de tranh SQL injection qua parameter binding
  // (parameter binding da safe nhung van chan `%_` wildcard de ket qua ban hon)
  const safe = trimmed.replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ');

  const numLimit = typeof limit === 'number' && !isNaN(limit) ? limit : 5;
  const safeLimit = Math.min(Math.max(1, Math.floor(numLimit)), maxLimit);

  return { query: safe, limit: safeLimit };
}

/**
 * Validate product ID (ULID).
 */
export function validateProductId(id: unknown): NormalizedIdInput {
  if (typeof id !== 'string') throw new ToolInputError('id phai la chuoi.');
  const t = id.trim();
  if (!ULID_REGEX.test(t)) {
    throw new ToolInputError('productId khong dung dinh dang ULID.');
  }
  return { id: t };
}

/**
 * Validate order identifier — accept ULID | order_number | email | phone.
 * Tra ve kind de caller quyet dinh strategy query.
 */
export function validateOrderSearchInput(
  keyword: unknown,
  limit: unknown,
): NormalizedOrderSearchInput {
  if (typeof keyword !== 'string') {
    throw new ToolInputError('keyword phai la chuoi.');
  }
  const raw = keyword.trim();
  if (raw.length === 0) {
    throw new ToolInputError('keyword khong duoc rong.');
  }
  if (raw.length > MAX_IDENTIFIER_LEN) {
    throw new ToolInputError(`keyword qua dai (> ${MAX_IDENTIFIER_LEN}).`);
  }

  const normalizedPhone = raw.replace(/\s+/g, '');
  let kind: NormalizedOrderSearchInput['kind'];
  if (ULID_REGEX.test(raw)) kind = 'ulid';
  else if (EMAIL_REGEX.test(raw)) kind = 'email';
  else if (PHONE_REGEX.test(normalizedPhone)) kind = 'phone';
  else if (ORDER_ID_REGEX.test(raw)) kind = 'order_number';
  else kind = 'text';

  const numLimit = typeof limit === 'number' && !isNaN(limit) ? limit : 5;
  const safeLimit = Math.min(Math.max(1, Math.floor(numLimit)), 10);

  return { keyword: raw, limit: safeLimit, kind };
}

/**
 * Validate order ID (ULID or order_number format).
 */
export function validateOrderId(id: unknown): {
  id: string;
  isUlid: boolean;
} {
  if (typeof id !== 'string') {
    throw new ToolInputError('orderId phai la chuoi.');
  }
  const t = id.trim();
  if (!t) throw new ToolInputError('orderId rong.');
  if (ULID_REGEX.test(t)) return { id: t, isUlid: true };
  if (ORDER_ID_REGEX.test(t)) return { id: t, isUlid: false };
  throw new ToolInputError('orderId khong dung dinh dang.');
}
