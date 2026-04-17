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
 * Usage — theo doi muc su dung cua tenant theo tung metric va ky han.
 * Khong extend BaseEntity vi khong can updated_at va deleted_at.
 */
@Entity('usages')
@Index(['tenant_id', 'metric', 'period_start'])
@Index(['tenant_id', 'period_end'])
export class Usage {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 26 })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50 })
  metric: string;

  @Column({ type: 'bigint' })
  value: number;

  @Column({ type: 'timestamp' })
  period_start: Date;

  @Column({ type: 'timestamp' })
  period_end: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
