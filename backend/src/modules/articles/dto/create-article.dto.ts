import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ArticleStatus } from '../../../common/constants/index.js';

export class CreateArticleDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  featured_image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seo_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seo_keywords?: string;
}
