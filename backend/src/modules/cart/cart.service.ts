import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Cart, CartStatus } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';

/**
 * Cart service — quan ly gio hang, ho tro guest cart va merge khi dang nhap.
 */
@Injectable()
export class CartService extends BaseService<Cart> {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {
    super(cartRepository, 'Cart');
  }

  /**
   * Lay hoac tao gio hang — uu tien userId, fallback sessionId.
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    let cart: Cart | null = null;

    if (userId) {
      cart = await this.cartRepository.findOne({
        where: { user_id: userId, status: CartStatus.ACTIVE },
        relations: ['items'],
      });
    }

    if (!cart && sessionId) {
      cart = await this.cartRepository.findOne({
        where: { session_id: sessionId, status: CartStatus.ACTIVE },
        relations: ['items'],
      });
    }

    if (!cart) {
      cart = await this.create({
        user_id: userId || null,
        session_id: sessionId || null,
        status: CartStatus.ACTIVE,
      } as any);
      cart.items = [];
    }

    return cart;
  }

  /**
   * Them san pham vao gio hang. Neu da co thi tang so luong.
   */
  async addItem(cartId: string, dto: AddToCartDto): Promise<CartItem> {
    // Kiem tra san pham da co trong gio chua
    const existing = await this.cartItemRepository.findOne({
      where: {
        cart_id: cartId,
        product_id: dto.product_id,
        variant_id: dto.variant_id || (null as any),
      },
    });

    if (existing) {
      existing.quantity += dto.quantity || 1;
      return this.cartItemRepository.save(existing);
    }

    const item = this.cartItemRepository.create({
      cart_id: cartId,
      product_id: dto.product_id,
      variant_id: dto.variant_id || null,
      quantity: dto.quantity || 1,
      price: 0, // Se duoc cap nhat tu product price
    });

    return this.cartItemRepository.save(item);
  }

  /**
   * Cap nhat so luong san pham trong gio.
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartItem> {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart_id: cartId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = quantity;
    return this.cartItemRepository.save(item);
  }

  /**
   * Xoa san pham khoi gio hang.
   */
  async removeItem(cartId: string, itemId: string): Promise<void> {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart_id: cartId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(item);
  }

  /**
   * Xoa toan bo gio hang.
   */
  async clearCart(cartId: string): Promise<void> {
    await this.cartItemRepository.delete({ cart_id: cartId });
  }

  /**
   * Lay gio hang kem danh sach san pham.
   */
  async getCartWithItems(cartId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  /**
   * Gop gio hang guest vao gio hang user khi dang nhap.
   */
  async mergeGuestCart(sessionId: string, userId: string): Promise<Cart> {
    const guestCart = await this.cartRepository.findOne({
      where: { session_id: sessionId, status: CartStatus.ACTIVE },
      relations: ['items'],
    });

    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart(userId);
    }

    const userCart = await this.getOrCreateCart(userId);

    // Gop tung item tu guest cart vao user cart
    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items?.find(
        (i) =>
          i.product_id === guestItem.product_id &&
          i.variant_id === guestItem.variant_id,
      );

      if (existingItem) {
        existingItem.quantity += guestItem.quantity;
        await this.cartItemRepository.save(existingItem);
      } else {
        await this.cartItemRepository.save(
          this.cartItemRepository.create({
            cart_id: userCart.id,
            product_id: guestItem.product_id,
            variant_id: guestItem.variant_id,
            quantity: guestItem.quantity,
            price: guestItem.price,
            metadata: guestItem.metadata,
          }),
        );
      }
    }

    // Danh dau guest cart da merge
    guestCart.status = CartStatus.MERGED;
    await this.cartRepository.save(guestCart);

    return this.getCartWithItems(userCart.id);
  }

  /**
   * Tinh tong gia tri gio hang.
   */
  async calculateTotal(cartId: string): Promise<number> {
    const cart = await this.getCartWithItems(cartId);
    return cart.items.reduce(
      (total, item) => total + Number(item.price) * item.quantity,
      0,
    );
  }

  /**
   * Danh dau gio hang bo roi — helper cho cron job.
   */
  async markAbandoned(): Promise<number> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 7); // 7 ngay khong hoat dong

    const result = await this.cartRepository
      .createQueryBuilder()
      .update(Cart)
      .set({ status: CartStatus.ABANDONED })
      .where('status = :status', { status: CartStatus.ACTIVE })
      .andWhere('updated_at < :threshold', { threshold })
      .execute();

    return result.affected || 0;
  }
}
