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
 * Ghi lai hanh dong cua nguoi dung trong he thong.
 * Dung cho audit trail: ai lam gi, luc nao, thay doi nhung gi.
 */
@Entity('audit_logs')
@Index(['user_id', 'created_at'])
@Index(['entity_type', 'entity_id'])
@Index(['action', 'created_at'])
export class AuditLog {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 26, nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Column({ type: 'varchar', length: 26, nullable: true })
  entity_id: string | null;

  @Column({ type: 'json', nullable: true })
  old_values: Record<string, any> | null;

  @Column({ type: 'json', nullable: true })
  new_values: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
