import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { ArticleStatus } from '../../../common/constants/index.js';

export class QueryArticlesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  author_id?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_featured?: boolean;
}
