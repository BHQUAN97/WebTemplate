import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { PATTERNS } from './constants.js';

/**
 * @IsVietnamPhone — kiem tra so dien thoai VN
 * Rule: 10-11 digits, starts with 0
 */
export function IsVietnamPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isVietnamPhone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          return PATTERNS.VIETNAM_PHONE.test(value.trim());
        },
        defaultMessage(_args: ValidationArguments) {
          return 'So dien thoai phai gom 10-11 chu so, bat dau bang 0';
        },
      },
    });
  };
}
