import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';

/**
 * WebhookDelivery — log moi lan gui webhook, bao gom response va retry.
 * Khong extend BaseEntity vi khong can updated_at va deleted_at.
 */
@Entity('webhook_deliveries')
@Index(['webhook_id', 'created_at'])
@Index(['success', 'next_retry_at'])
export class WebhookDelivery {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 26 })
  webhook_id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  event: string;

  @Column({ type: 'json' })
  payload: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  response_status: number | null;

  @Column({ type: 'text', nullable: true })
  response_body: string | null;

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'int', nullable: true })
  duration_ms: number | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  next_retry_at: Date | null;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
