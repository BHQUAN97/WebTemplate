import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsDateString,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'])
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  per_user_limit?: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsObject()
  conditions?: {
    categories?: string[];
    products?: string[];
    min_quantity?: number;
  };
}
