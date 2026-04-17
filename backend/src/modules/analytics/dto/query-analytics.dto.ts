import { IsDateString, IsOptional, IsEnum } from 'class-validator';

export class QueryAnalyticsDto {
  @IsDateString()
  date_from: string;

  @IsDateString()
  date_to: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  group_by?: 'day' | 'week' | 'month';
}
