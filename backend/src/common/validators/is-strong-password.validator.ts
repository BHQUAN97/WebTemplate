import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { LIMITS, PATTERNS } from './constants.js';

/**
 * @IsStrongPassword — kiểm tra độ mạnh mật khẩu
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
          return 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt';
        },
      },
    });
  };
}
