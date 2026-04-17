import { IsOptional, IsString } from 'class-validator';

/**
 * DTO cho AuditLogsService.log() — internal use.
 * `changes` co the la object; service se JSON.stringify.
 */
export class CreateAuditLogDto {
  @IsOptional()
  @IsString()
  user_id?: string | null;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  resource_type?: string | null;

  @IsOptional()
  @IsString()
  resource_id?: string | null;

  @IsOptional()
  changes?: string | Record<string, any> | null;

  @IsOptional()
  @IsString()
  ip_address?: string | null;

  @IsOptional()
  @IsString()
  user_agent?: string | null;
}
