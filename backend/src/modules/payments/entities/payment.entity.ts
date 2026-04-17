import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { PaymentStatus } from '../../../common/constants/index.js';

/**
 * Thanh toan — luu thong tin giao dich, phuong thuc, trang thai.
 * Unique index tren order_id de ngan 2 payment cho cung 1 don hang (TOCTOU race).
 */
@Entity('payments')
@Index('uq_payments_order_id', ['order_id'], { unique: true })
export class Payment extends BaseEntity {
  @Column({ type: 'char', length: 26, unique: true })
  order_id: string;

  @Column({ type: 'varchar', length: 20 })
  method: 'vnpay' | 'momo' | 'stripe' | 'bank_transfer' | 'cod';

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_id: string | null;

  @Column({ type: 'json', nullable: true })
  gateway_response: Record<string, any> | null;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  refunded_at: Date | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;
}
