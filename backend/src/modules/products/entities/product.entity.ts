import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ProductVariant } from './product-variant.entity.js';

/**
 * San pham — luu thong tin chi tiet san pham, SEO, hinh anh, tags.
 */
@Entity('products')
@Index(['tenant_id', 'is_active'])
@Index(['tenant_id', 'category_id'])
@Index(['category_id', 'is_active'])
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 220, unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  short_description: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  sku: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  compare_at_price: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_price: number | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  category_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'json', nullable: true })
  images: Array<{ url: string; alt: string; sort_order: number }> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight: number | null;

  @Column({ type: 'json', nullable: true })
  dimensions: { length: number; width: number; height: number } | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  seo_title: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  seo_description: string | null;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];
}
