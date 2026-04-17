import { Entity, Column, PrimaryColumn, CreateDateColumn, BeforeInsert, Index } from 'typeorm';
import { generateUlid } from '../../../common/utils/ulid.js';

/**
 * Lich su su dung ma khuyen mai — tracking moi lan ap dung.
 */
@Entity('promotion_usages')
@Index(['promotion_id', 'user_id'])
export class PromotionUsage {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  promotion_id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  user_id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  order_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discount_amount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
