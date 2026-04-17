import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { BillingCycle } from '../entities/plan.entity.js';
import type { PlanFeatures } from '../entities/plan.entity.js';

export class CreatePlanDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(120)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsEnum(BillingCycle)
  billing_cycle: BillingCycle;

  @IsObject()
  features: PlanFeatures;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_popular?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  trial_days?: number;
}
