import { Entity, Column, PrimaryColumn, CreateDateColumn, BeforeInsert, Index } from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';

/**
 * Event tracking — product_view, add_to_cart, checkout, purchase, search.
 */
@Entity('events')
@Index(['name', 'created_at'])
@Index(['session_id', 'created_at'])
export class Event {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  name: 'product_view' | 'add_to_cart' | 'checkout' | 'purchase' | 'search';

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  user_id: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  session_id: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any> | null;

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
