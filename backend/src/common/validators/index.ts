/**
 * Barrel export cho base validators dung chung.
 * Import: `import { IsStrongPassword, LIMITS } from '@common/validators';`
 */
export { PATTERNS, LIMITS, UNSAFE_TEXT_PATTERNS } from './constants.js';
export { IsStrongPassword } from './is-strong-password.validator.js';
export { IsVietnamPhone } from './is-vietnam-phone.validator.js';
export { IsULID } from './is-ulid.validator.js';
export { IsPositivePrice } from './is-positive-price.validator.js';
export { Match } from './match.validator.js';
export { IsNotEmptyTrimmed } from './is-not-empty-trimmed.validator.js';
export { IsSafeText } from './is-safe-text.validator.js';
export { BaseDto } from './base.dto.js';
