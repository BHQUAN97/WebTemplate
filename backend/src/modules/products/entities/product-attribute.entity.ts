import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Thuoc tinh san pham — dinh nghia cac thuoc tinh chung (Color, Size) va gia tri cua chung.
 */
@Entity('product_attributes')
export class ProductAttribute extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'json' })
  values: string[];

  @Column({ type: 'varchar', length: 20 })
  type: 'select' | 'color' | 'text';

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
