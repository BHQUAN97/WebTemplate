import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Cart } from './cart.entity.js';

/**
 * San pham trong gio hang — luu product, variant, so luong, gia tai thoi diem them.
 * Unique (cart_id, product_id, variant_id) — chong duplicate khi 2 request cung add.
 */
@Entity('cart_items')
@Index(['cart_id', 'product_id'])
@Index(['cart_id', 'product_id', 'variant_id'], { unique: true })
export class CartItem extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  cart_id: string;

  @Index()
  @Column({ type: 'char', length: 26 })
  product_id: string;

  @Column({ type: 'char', length: 26, nullable: true })
  variant_id: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;
}
