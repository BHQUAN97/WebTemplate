import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Trang thai subscription.
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

/**
 * Subscription — lien ket tenant voi plan, theo doi thoi han va trang thai.
 */
@Entity('subscriptions')
@Index(['tenant_id', 'status'])
@Index(['plan_id', 'status'])
export class Subscription extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 26 })
  tenant_id: string;

  @Index()
  @Column({ type: 'varchar', length: 26 })
  plan_id: string;

  @Column({ type: 'enum', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp' })
  current_period_start: Date;

  @Column({ type: 'timestamp' })
  current_period_end: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  cancel_reason: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;
}
