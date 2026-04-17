import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Webhook — endpoint nhan su kien tu he thong.
 * Moi webhook co secret de ky HMAC, danh sach events, va dem loi.
 */
@Entity('webhooks')
@Index(['tenant_id', 'is_active'])
export class Webhook extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 26 })
  tenant_id: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'json' })
  events: string[];

  @Column({ type: 'varchar', length: 100 })
  secret: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_triggered_at: Date | null;

  @Column({ type: 'int', default: 0 })
  failure_count: number;
}
