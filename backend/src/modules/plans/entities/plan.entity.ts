import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Chu ky thanh toan.
 */
export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
  FREE = 'free',
}

/**
 * Cau truc features cua plan.
 */
export interface PlanFeatures {
  max_products: number;
  max_storage_gb: number;
  max_users: number;
  custom_domain: boolean;
  api_access: boolean;
  priority_support: boolean;
}

/**
 * Plan — goi dich vu voi gia, features, va chu ky thanh toan.
 */
@Entity('plans')
export class Plan extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'enum', enum: BillingCycle })
  billing_cycle: BillingCycle;

  @Column({ type: 'json' })
  features: PlanFeatures;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_popular: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'int', default: 0 })
  trial_days: number;
}
