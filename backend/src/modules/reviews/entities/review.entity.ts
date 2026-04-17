import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Danh gia san pham — luu rating, noi dung, hinh anh, phe duyet admin.
 */
@Entity('reviews')
@Index(['product_id', 'is_approved'])
@Index(['tenant_id', 'is_approved'])
@Index(['user_id', 'product_id'])
export class Review extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  product_id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  user_id: string;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ type: 'boolean', default: false })
  is_verified_purchase: boolean;

  @Column({ type: 'boolean', default: false })
  is_approved: boolean;

  @Column({ type: 'text', nullable: true })
  admin_reply: string | null;

  @Column({ type: 'timestamp', nullable: true })
  replied_at: Date | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
