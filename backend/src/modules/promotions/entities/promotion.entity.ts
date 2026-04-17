import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Khuyen mai — ma giam gia, dieu kien ap dung, gioi han su dung.
 */
@Entity('promotions')
@Index(['tenant_id', 'is_active'])
@Index(['start_date', 'end_date'])
export class Promotion extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'],
  })
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  min_order_amount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  max_discount_amount: number | null;

  @Column({ type: 'int', nullable: true })
  usage_limit: number | null;

  @Column({ type: 'int', default: 0 })
  used_count: number;

  @Column({ type: 'int', default: 1 })
  per_user_limit: number;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'json', nullable: true })
  conditions: {
    categories?: string[];
    products?: string[];
    min_quantity?: number;
  } | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
