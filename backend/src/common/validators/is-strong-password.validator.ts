import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { LIMITS, PATTERNS } from './constants.js';

/**
 * @IsStrongPassword — kiem tra do manh mat khau
 * Rule: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (value.length > LIMITS.PASSWORD_MAX) return false;
          return PATTERNS.STRONG_PASSWORD.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Mat khau phai co it nhat 8 ky tu, 1 chu hoa, 1 chu thuong, 1 so, 1 ky tu dac biet';
        },
      },
    });
  };
}
