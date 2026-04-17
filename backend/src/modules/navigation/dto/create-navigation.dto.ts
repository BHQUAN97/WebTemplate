import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNavigationItemDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  page_id?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  target?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNavigationItemDto)
  children?: CreateNavigationItemDto[];
}

export class CreateNavigationDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  location: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNavigationItemDto)
  items?: CreateNavigationItemDto[];
}
