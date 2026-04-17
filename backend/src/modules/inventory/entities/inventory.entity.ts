import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Ton kho — theo doi so luong, nguong canh bao, cho phep dat truoc.
 */
@Entity('inventory')
@Index(['product_id', 'variant_id'])
export class Inventory extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  product_id: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  variant_id: string | null;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  reserved: number;

  @Column({ type: 'int', default: 10 })
  low_stock_threshold: number;

  @Column({ type: 'boolean', default: true })
  track_inventory: boolean;

  @Column({ type: 'boolean', default: false })
  allow_backorder: boolean;
}
