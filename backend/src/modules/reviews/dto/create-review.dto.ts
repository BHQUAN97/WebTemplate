import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  product_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
