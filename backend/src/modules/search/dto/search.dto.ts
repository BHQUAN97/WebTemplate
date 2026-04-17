import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDto {
  // Khong dung @MinLength tai DTO — service tu return empty cho query qua ngan
  // (thay vi throw 400 Bad Request, FE handle nhe nhang hon).
  // @MaxLength chan attacker gui chuoi qua dai gay regex/parse cost.
  @IsString()
  @MaxLength(200)
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
