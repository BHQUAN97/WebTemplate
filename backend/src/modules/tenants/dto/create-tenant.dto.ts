import { IsString, IsOptional, IsObject, MaxLength, IsUrl } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
