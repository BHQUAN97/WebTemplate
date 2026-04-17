import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryCategoriesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_active?: boolean;
}
