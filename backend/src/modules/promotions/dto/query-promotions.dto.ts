import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryPromotionsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsEnum(['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'])
  type?: string;
}
