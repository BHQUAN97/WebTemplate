import { IsOptional, IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  max_price?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  tags?: string;
}
