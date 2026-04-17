import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';

/**
 * Page view — tracking luot xem trang, thiet bi, nguon truy cap.
 */
@Entity('page_views')
@Index(['session_id', 'created_at'])
export class PageView {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column({ type: 'varchar', length: 500 })
  page_url: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  page_title: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  user_id: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  session_id: string;

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referer: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  device_type: 'desktop' | 'mobile' | 'tablet' | null;

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
