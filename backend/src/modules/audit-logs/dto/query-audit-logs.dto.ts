import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * Query DTO cho GET /audit-logs.
 * Cho phep filter theo user, action, resource va khoang thoi gian.
 */
export class QueryAuditLogsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Loc theo user ID' })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Loc theo action name' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Loc theo resource type' })
  @IsOptional()
  @IsString()
  resource_type?: string;

  @ApiPropertyOptional({ description: 'Loc theo resource ID' })
  @IsOptional()
  @IsString()
  resource_id?: string;

  @ApiPropertyOptional({ description: 'Tu ngay (ISO string)' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Den ngay (ISO string)' })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}
