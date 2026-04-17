/**
 * Shared validation regex patterns & limits.
 * Single source of truth for backend — FE mirror tai frontend/src/lib/validations/base.ts
 */
export const PATTERNS = {
  /** Min 8 chars, 1 lowercase, 1 uppercase, 1 digit, 1 special */
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
  /** Vietnam phone — starts with 0, 10 or 11 digits total */
  VIETNAM_PHONE: /^0\d{9,10}$/,
  /** ULID — 26 chars Crockford base32 */
  ULID: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /** Username — 3-30 chars, alphanumeric + underscore */
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  /** Positive price with up to 2 decimal places */
  POSITIVE_PRICE: /^(?:\d+)(?:\.\d{1,2})?$/,
} as const;

/** Shared sizing limits — must match FE LIMITS */
export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 100,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  EMAIL_MAX: 255,
  PHONE_MIN: 10,
  PHONE_MAX: 11,
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  PRICE_MIN: 0,
  PRICE_MAX: 1_000_000_000,
} as const;

/** HTML / script injection heuristic patterns (used by IsSafeText) */
export const UNSAFE_TEXT_PATTERNS: RegExp[] = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /<iframe\b[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=\s*["']/i, // onclick=, onerror=, ...
];
