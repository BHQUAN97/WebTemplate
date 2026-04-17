import { IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO cho cac endpoint analytics co range filter optional.
 * Khac QueryAnalyticsDto o cho `from`/`to` khong bat buoc.
 */
export class RangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/**
 * DTO cho top-products — co them `limit`.
 */
export class TopProductsQueryDto extends RangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
