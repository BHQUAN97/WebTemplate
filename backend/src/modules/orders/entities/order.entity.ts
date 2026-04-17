import { Entity, Column, OneToMany, OneToOne, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { OrderStatus } from '../../../common/constants/index.js';
import { OrderItem } from './order-item.entity.js';

/**
 * Interface dia chi giao hang.
 */
export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  zip?: string;
}

/**
 * Don hang — luu thong tin don hang, dia chi, gia tri, trang thai.
 */
@Entity('orders')
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'created_at'])
@Index(['user_id', 'created_at'])
@Index(['order_number'], { unique: true })
export class Order extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true })
  order_number: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  user_id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shipping_fee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'json' })
  shipping_address: ShippingAddress;

  @Column({ type: 'json', nullable: true })
  billing_address: ShippingAddress | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  promotion_code: string | null;

  @Column({ type: 'text', nullable: true })
  cancelled_reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  shipped_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
