import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { UNSAFE_TEXT_PATTERNS } from './constants.js';

/**
 * @IsSafeText — reject script tags, HTML injection patterns, javascript: URIs, inline event handlers.
 */
export function IsSafeText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeText',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null) return true; // optional — dung thêm @IsNotEmpty neu bat buoc
          if (typeof value !== 'string') return false;
          return !UNSAFE_TEXT_PATTERNS.some((re) => re.test(value));
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Van ban chua ky tu khong hop le';
        },
      },
    });
  };
}
