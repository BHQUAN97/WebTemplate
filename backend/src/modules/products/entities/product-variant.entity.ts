import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Product } from './product.entity.js';

/**
 * Bien the san pham — luu gia, SKU, thuoc tinh (mau sac, kich co) cho tung variant.
 */
@Entity('product_variants')
@Index(['product_id', 'is_active'])
export class ProductVariant extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  product_id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  compare_at_price: number | null;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, string> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
