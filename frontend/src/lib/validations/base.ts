import { z } from 'zod';

/**
 * FE validation primitives — mirror BE constants.
 * Source of truth: giữ đồng bộ với backend/src/common/validators/constants.ts
 */
export const PATTERNS = {
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
  VIETNAM_PHONE: /^0\d{9,10}$/,
  ULID: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  POSITIVE_PRICE: /^(?:\d+)(?:\.\d{1,2})?$/,
} as const;

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

/** HTML / script injection heuristic patterns */
export const UNSAFE_TEXT_PATTERNS: RegExp[] = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /<iframe\b[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=\s*["']/i,
];

// ============================================================
// Messages (Tiếng Việt - đồng bộ với BE)
// ============================================================
export const MESSAGES = {
  EMAIL_INVALID: 'Email không hợp lệ',
  EMAIL_REQUIRED: 'Vui lòng nhập email',
  PASSWORD_WEAK:
    'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt',
  PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu',
  CONFIRM_MISMATCH: 'Mật khẩu xác nhận không khớp',
  PHONE_INVALID: 'Số điện thoại phải gồm 10-11 chữ số, bắt đầu bằng 0',
  ULID_INVALID: 'ID không hợp lệ',
  USERNAME_INVALID:
    'Tên đăng nhập phải 3-30 ký tự, chỉ gồm chữ, số và dấu gạch dưới',
  PRICE_INVALID: 'Giá phải là số dương',
  NAME_SHORT: `Họ tên phải có ít nhất ${LIMITS.NAME_MIN} ký tự`,
  NAME_LONG: `Họ tên không được quá ${LIMITS.NAME_MAX} ký tự`,
  SAFE_TEXT: 'Văn bản chứa ký tự không hợp lệ',
} as const;

// ============================================================
// Zod primitives — tái sử dụng trong các schema khác
// ============================================================

export const zEmail = z
  .string({ error: MESSAGES.EMAIL_REQUIRED })
  .trim()
  .min(1, MESSAGES.EMAIL_REQUIRED)
  .max(LIMITS.EMAIL_MAX, `Email không được quá ${LIMITS.EMAIL_MAX} ký tự`)
  .email(MESSAGES.EMAIL_INVALID);

export const zStrongPassword = z
  .string({ error: MESSAGES.PASSWORD_REQUIRED })
  .min(LIMITS.PASSWORD_MIN, MESSAGES.PASSWORD_WEAK)
  .max(
    LIMITS.PASSWORD_MAX,
    `Mật khẩu không được quá ${LIMITS.PASSWORD_MAX} ký tự`,
  )
  .regex(PATTERNS.STRONG_PASSWORD, MESSAGES.PASSWORD_WEAK);

export const zVietnamPhone = z
  .string()
  .trim()
  .regex(PATTERNS.VIETNAM_PHONE, MESSAGES.PHONE_INVALID);

/** Phone optional — cho phép empty string */
export const zVietnamPhoneOptional = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => !val || PATTERNS.VIETNAM_PHONE.test(val),
    MESSAGES.PHONE_INVALID,
  );

export const zULID = z.string().regex(PATTERNS.ULID, MESSAGES.ULID_INVALID);

export const zUsername = z
  .string()
  .trim()
  .regex(PATTERNS.USERNAME, MESSAGES.USERNAME_INVALID);

export const zName = z
  .string()
  .trim()
  .min(LIMITS.NAME_MIN, MESSAGES.NAME_SHORT)
  .max(LIMITS.NAME_MAX, MESSAGES.NAME_LONG);

export const zPositivePrice = z
  .number({ error: MESSAGES.PRICE_INVALID })
  .positive(MESSAGES.PRICE_INVALID)
  .max(LIMITS.PRICE_MAX, MESSAGES.PRICE_INVALID);

export const zSafeText = z
  .string()
  .refine(
    (val) => !UNSAFE_TEXT_PATTERNS.some((re) => re.test(val)),
    MESSAGES.SAFE_TEXT,
  );

// ============================================================
// Helpers / factories
// ============================================================

/**
 * Factory tạo required string field với message có label.
 * Usage: `zRequiredString('Họ tên')`
 */
export const zRequiredString = (label: string) =>
  z
    .string({ error: `${label} là bắt buộc` })
    .trim()
    .min(1, `${label} là bắt buộc`);

/**
 * Factory tạo refine function cho confirm field.
 * Usage:
 *   schema.refine(...zConfirm('password', 'confirmPassword'))
 */
export const zConfirm = <T extends Record<string, unknown>>(
  sourceField: string,
  confirmField: string,
  message: string = MESSAGES.CONFIRM_MISMATCH,
) =>
  [
    (data: T) => data[sourceField] === data[confirmField],
    { message, path: [confirmField] },
  ] as const;
