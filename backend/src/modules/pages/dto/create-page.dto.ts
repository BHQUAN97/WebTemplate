import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreatePageDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  template?: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seo_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seo_description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
