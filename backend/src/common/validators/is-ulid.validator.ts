import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { PATTERNS } from './constants.js';

/**
 * @IsULID — kiem tra ID la ULID hop le (26 chars Crockford base32)
 */
export function IsULID(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isULID',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return PATTERNS.ULID.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'ID khong hop le';
        },
      },
    });
  };
}
