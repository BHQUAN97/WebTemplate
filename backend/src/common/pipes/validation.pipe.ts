import {
  ValidationPipe,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';

/**
 * Format validation errors into clean, user-friendly messages.
 */
function formatErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    // Xu ly nested validation errors
    if (error.children && error.children.length > 0) {
      const childMessages = formatErrors(error.children);
      messages.push(...childMessages.map((msg) => `${error.property}.${msg}`));
    }
  }

  return messages;
}

/**
 * Custom validation pipe that transforms input and validates using class-validator.
 * Returns clean, readable error messages instead of raw validation objects.
 *
 * @example
 * ```ts
 * // In main.ts
 * app.useGlobalPipes(new CustomValidationPipe());
 * ```
 */
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = formatErrors(errors);
        return new BadRequestException({
          message: messages,
          error: 'Validation Error',
          statusCode: 400,
        });
      },
    });
  }
}
