import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Thong bao — in-app, email, push cho nguoi dung.
 */
@Entity('notifications')
@Index(['user_id', 'is_read'])
@Index(['user_id', 'created_at'])
@Index(['tenant_id', 'created_at'])
export class Notification extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'order_status' | 'review_reply' | 'promotion' | 'system' | 'welcome';

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: { link?: string; entity_type?: string; entity_id?: string } | null;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  @Column({
    type: 'enum',
    enum: ['in_app', 'email', 'push'],
    default: 'in_app',
  })
  channel: 'in_app' | 'email' | 'push';

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
