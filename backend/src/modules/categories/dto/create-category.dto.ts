import {
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  parent_id?: string;

  @IsString()
  @IsIn(['product', 'article', 'faq', 'general'])
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;
}
