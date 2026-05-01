import { IsOptional, IsString, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryLogsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entity_type?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
