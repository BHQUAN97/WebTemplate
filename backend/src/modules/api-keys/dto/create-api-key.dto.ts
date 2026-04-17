import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  scopes: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  rate_limit?: number;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
