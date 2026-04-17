import { IsString, IsOptional, IsInt, IsEnum, MinLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDto {
  @IsString()
  @MinLength(2)
  query: string;

  @IsOptional()
  @IsEnum(['product', 'article', 'page', 'all'])
  type?: 'product' | 'article' | 'page' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
