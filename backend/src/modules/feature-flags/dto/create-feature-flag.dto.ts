import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureFlagDto {
  @ApiProperty({
    description: 'Unique key (snake_case)',
    example: 'new_checkout',
  })
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'key chi chap nhan chu thuong, so va dau gach duoi',
  })
  key: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rollout_percentage?: number;

  @ApiPropertyOptional({ type: [String], example: ['admin', 'editor'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  target_roles?: string[];
}
