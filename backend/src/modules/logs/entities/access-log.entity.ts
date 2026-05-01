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
 * Ghi lai cac request HTTP den he thong.
 * Dung cho thong ke truy cap, phat hien bat thuong.
 */
@Entity('access_logs')
@Index(['user_id', 'created_at'])
@Index(['status_code', 'created_at'])
export class AccessLog {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 26, nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'int' })
  status_code: number;

  @Column({ type: 'int' })
  duration_ms: number;

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referer: string | null;

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
