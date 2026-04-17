import { IsOptional, IsIn, IsISO8601 } from 'class-validator';

/**
 * Cac format report ho tro.
 */
export type ReportFormat = 'xlsx' | 'pdf' | 'csv';

/**
 * Query DTO chung cho cac endpoint report.
 * dateFrom/dateTo la ISO8601, format default 'xlsx'.
 */
export class ReportQueryDto {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsIn(['xlsx', 'pdf', 'csv'])
  format?: ReportFormat;
}
