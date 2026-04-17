import { z } from 'zod';

/**
 * FE validation primitives — mirror BE constants.
 * Source of truth: giu dong bo voi backend/src/common/validators/constants.ts
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
// Messages (Tieng Viet - dong bo voi BE)
// ============================================================
export const MESSAGES = {
  EMAIL_INVALID: 'Email khong hop le',
  EMAIL_REQUIRED: 'Vui long nhap email',
  PASSWORD_WEAK:
    'Mat khau phai co it nhat 8 ky tu, 1 chu hoa, 1 chu thuong, 1 so, 1 ky tu dac biet',
  PASSWORD_REQUIRED: 'Vui long nhap mat khau',
  CONFIRM_MISMATCH: 'Mat khau xac nhan khong khop',
  PHONE_INVALID: 'So dien thoai phai gom 10-11 chu so, bat dau bang 0',
  ULID_INVALID: 'ID khong hop le',
  USERNAME_INVALID:
    'Ten dang nhap phai 3-30 ky tu, chi gom chu, so va dau gach duoi',
  PRICE_INVALID: 'Gia phai la so duong',
  NAME_SHORT: `Ho ten phai co it nhat ${LIMITS.NAME_MIN} ky tu`,
  NAME_LONG: `Ho ten khong duoc qua ${LIMITS.NAME_MAX} ky tu`,
  SAFE_TEXT: 'Van ban chua ky tu khong hop le',
} as const;

// ============================================================
// Zod primitives — tai su dung trong cac schema khac
// ============================================================

export const zEmail = z
  .string({ error: MESSAGES.EMAIL_REQUIRED })
  .trim()
  .min(1, MESSAGES.EMAIL_REQUIRED)
  .max(LIMITS.EMAIL_MAX, `Email khong duoc qua ${LIMITS.EMAIL_MAX} ky tu`)
  .email(MESSAGES.EMAIL_INVALID);

export const zStrongPassword = z
  .string({ error: MESSAGES.PASSWORD_REQUIRED })
  .min(LIMITS.PASSWORD_MIN, MESSAGES.PASSWORD_WEAK)
  .max(
    LIMITS.PASSWORD_MAX,
    `Mat khau khong duoc qua ${LIMITS.PASSWORD_MAX} ky tu`,
  )
  .regex(PATTERNS.STRONG_PASSWORD, MESSAGES.PASSWORD_WEAK);

export const zVietnamPhone = z
  .string()
  .trim()
  .regex(PATTERNS.VIETNAM_PHONE, MESSAGES.PHONE_INVALID);

/** Phone optional — cho phep empty string */
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
 * Factory tao required string field voi message co label.
 * Usage: `zRequiredString('Ho ten')`
 */
export const zRequiredString = (label: string) =>
  z
    .string({ error: `${label} la bat buoc` })
    .trim()
    .min(1, `${label} la bat buoc`);

/**
 * Factory tao refine function cho confirm field.
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
