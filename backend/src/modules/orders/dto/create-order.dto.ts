import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  product_id: string;

  @IsOptional()
  @IsString()
  variant_id?: string;

  @IsString()
  @MaxLength(200)
  product_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  variant_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}

export class ShippingAddressDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(500)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  district: string;

  @IsString()
  @MaxLength(100)
  ward: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zip?: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shipping_address: ShippingAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  billing_address?: ShippingAddressDto;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  promotion_code?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsBoolean()
  from_cart?: boolean;
}
