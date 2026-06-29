import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

/**
 * Danh sach san pham yeu thich cua user.
 * Unique(user_id, product_id) — moi san pham chi luu 1 lan.
 */
@Entity('wishlists')
@Unique(['user_id', 'product_id'])
@Index(['user_id', 'tenant_id'])
export class Wishlist extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  user_id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  product_id: string;

  @Column({ type: 'char', length: 26, nullable: true })
  tenant_id: string | null;
}
