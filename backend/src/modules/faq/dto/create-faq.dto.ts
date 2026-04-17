import { IsString, IsOptional, IsInt, MaxLength, Min } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @MaxLength(500)
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
