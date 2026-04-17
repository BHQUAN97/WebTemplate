import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Order } from './order.entity.js';

/**
 * Chi tiet don hang — snapshot thong tin san pham tai thoi diem dat hang.
 */
@Entity('order_items')
@Index(['order_id', 'product_id'])
export class OrderItem extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  order_id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  product_id: string;

  @Column({ type: 'char', length: 26, nullable: true })
  variant_id: string | null;

  @Column({ type: 'varchar', length: 200 })
  product_name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  variant_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
