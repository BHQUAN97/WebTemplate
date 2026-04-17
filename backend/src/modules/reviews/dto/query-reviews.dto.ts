import { IsOptional, IsString, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryReviewsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_approved?: boolean;
}
