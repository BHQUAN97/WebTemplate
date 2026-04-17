import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { CartItem } from './cart-item.entity.js';

/**
 * Enum trang thai gio hang.
 */
export enum CartStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  CONVERTED = 'converted',
  ABANDONED = 'abandoned',
}

/**
 * Gio hang — ho tro ca user dang nhap va guest (session).
 */
@Entity('carts')
@Index(['user_id', 'status'])
@Index(['session_id', 'status'])
export class Cart extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  user_id: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  session_id: string | null;

  @Column({ type: 'enum', enum: CartStatus, default: CartStatus.ACTIVE })
  status: CartStatus;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];
}
