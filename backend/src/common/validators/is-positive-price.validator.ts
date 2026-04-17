import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { LIMITS } from './constants.js';

/**
 * @IsPositivePrice — gia tri la so duong, toi da 2 chu so thap phan
 */
export function IsPositivePrice(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositivePrice',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          const n =
            typeof value === 'string' ? Number(value) : (value as number);
          if (typeof n !== 'number' || !Number.isFinite(n)) return false;
          if (n <= LIMITS.PRICE_MIN) return false;
          if (n > LIMITS.PRICE_MAX) return false;
          // Check toi da 2 chu so thap phan
          return Math.round(n * 100) === n * 100;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Gia phai la so duong';
        },
      },
    });
  };
}
