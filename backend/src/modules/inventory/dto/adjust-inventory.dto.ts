import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { MovementType } from '../entities/inventory-movement.entity.js';

export class AdjustInventoryDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsInt()
  quantity_change: number;

  @IsEnum(MovementType)
  type: MovementType;

  @IsOptional()
  @IsString()
  note?: string;
}
