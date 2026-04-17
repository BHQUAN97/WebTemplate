import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../../common/constants/index.js';

export class QueryOrdersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsString()
  order_number?: string;
}
