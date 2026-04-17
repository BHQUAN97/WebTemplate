import { applyDecorators } from '@nestjs/common';

/**
 * Composite decorator for Swagger pagination query parameters.
 * Apply to list endpoints that accept PaginationDto.
 *
 * Note: Requires @nestjs/swagger to be installed.
 * If swagger is not available, this is a no-op decorator.
 *
 * @example
 * ```ts
 * @ApiPaginated()
 * @Get()
 * findAll(@Query() query: PaginationDto) { ... }
 * ```
 */
export function ApiPaginated() {
  try {
    // Dynamic import de khong loi khi chua cai swagger
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swagger = require('@nestjs/swagger');
    return applyDecorators(
      swagger.ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
      swagger.ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
      swagger.ApiQuery({ name: 'search', required: false, type: String }),
      swagger.ApiQuery({ name: 'sort', required: false, type: String }),
      swagger.ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] }),
    );
  } catch {
    // Swagger chua cai → no-op
    return applyDecorators();
  }
}
