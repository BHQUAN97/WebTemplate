import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  product_id: string;

  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}
