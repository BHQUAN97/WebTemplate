import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(50)
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compare_at_price?: number;

  @IsOptional()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  short_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compare_at_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsArray()
  images?: Array<{ url: string; alt: string; sort_order: number }>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seo_description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
