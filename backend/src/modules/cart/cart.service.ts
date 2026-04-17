import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Cart, CartStatus } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';

/**
 * Cart service — quan ly gio hang, ho tro guest cart va merge khi dang nhap.
 * Snapshot gia + check stock tai thoi diem add de chong gian lan price /
 * oversell sau khi gia/ton kho thay doi.
 */
@Injectable()
export class CartService extends BaseService<Cart> {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly inventoryService: InventoryService,
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
   * Resolve gia + ton kho an toan tu DB cho 1 product/variant.
   * Throw BadRequest neu product khong ton tai/inactive hoac variant khong khop.
   */
  private async resolvePrice(
    productId: string,
    variantId?: string | null,
  ): Promise<number> {
    const product = await this.productRepository.findOne({
      where: { id: productId, is_active: true },
    });
    if (!product) {
      throw new BadRequestException('Sản phẩm không tồn tại hoặc đã ẩn');
    }
    if (variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: variantId, product_id: productId, is_active: true },
      });
      if (!variant) {
        throw new BadRequestException('Biến thể không hợp lệ cho sản phẩm này');
      }
      return Number(variant.price);
    }
    return Number(product.price);
  }

  /**
   * Them san pham vao gio hang — snapshot gia + check stock truoc.
   * Atomic upsert tranh race khi 2 request cung add 1 san pham:
   * neu da co thi tang qty (UPDATE), khong co thi INSERT.
   */
  async addItem(cartId: string, dto: AddToCartDto): Promise<CartItem> {
    const quantity = dto.quantity || 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Số lượng phải là số nguyên dương');
    }

    const price = await this.resolvePrice(dto.product_id, dto.variant_id);

    // Tinh tong qty se co trong gio sau khi add (de check stock chinh xac)
    const existing = await this.cartItemRepository.findOne({
      where: {
        cart_id: cartId,
        product_id: dto.product_id,
        variant_id: dto.variant_id || (IsNull() as any),
      },
    });

    const finalQty = (existing?.quantity || 0) + quantity;

    // Check stock — neu khong du throw 400 ngay
    const inStock = await this.inventoryService.isInStock(
      dto.product_id,
      dto.variant_id,
      finalQty,
    );
    if (!inStock) {
      throw new BadRequestException(
        'Sản phẩm không đủ tồn kho cho số lượng yêu cầu',
      );
    }

    if (existing) {
      // Atomic increment — tranh lost update khi 2 request cung tang qty
      await this.cartItemRepository
        .createQueryBuilder()
        .update(CartItem)
        .set({
          quantity: () => `quantity + ${Number(quantity) || 0}`,
          price, // Refresh price snapshot
        })
        .where('id = :id', { id: existing.id })
        .execute();
      return this.cartItemRepository.findOneOrFail({
        where: { id: existing.id },
      });
    }

    const item = this.cartItemRepository.create({
      cart_id: cartId,
      product_id: dto.product_id,
      variant_id: dto.variant_id || null,
      quantity,
      price,
    });

    try {
      return await this.cartItemRepository.save(item);
    } catch (err: any) {
      // Race: 2 request cung INSERT cho cung (cart, product, variant) →
      // unique constraint reject 1 cai. Re-fetch va atomic increment.
      if (
        err?.code === 'ER_DUP_ENTRY' ||
        err?.errno === 1062 ||
        /duplicate/i.test(err?.message || '')
      ) {
        const dup = await this.cartItemRepository.findOne({
          where: {
            cart_id: cartId,
            product_id: dto.product_id,
            variant_id: dto.variant_id || (IsNull() as any),
          },
        });
        if (dup) {
          await this.cartItemRepository
            .createQueryBuilder()
            .update(CartItem)
            .set({
              quantity: () => `quantity + ${Number(quantity) || 0}`,
              price,
            })
            .where('id = :id', { id: dup.id })
            .execute();
          return this.cartItemRepository.findOneOrFail({
            where: { id: dup.id },
          });
        }
      }
      throw err;
    }
  }

  /**
   * Cap nhat so luong san pham trong gio. Validate quantity > 0 va con stock.
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartItem> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Số lượng phải là số nguyên dương');
    }

    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart_id: cartId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const inStock = await this.inventoryService.isInStock(
      item.product_id,
      item.variant_id || undefined,
      quantity,
    );
    if (!inStock) {
      throw new BadRequestException(
        'Sản phẩm không đủ tồn kho cho số lượng yêu cầu',
      );
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
   * Validate stock cho tong qty sau merge — chong oversell.
   * Refresh price snapshot tu DB (gia guest co the da cu).
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

    for (const guestItem of guestCart.items) {
      const existingItem = userCart.items?.find(
        (i) =>
          i.product_id === guestItem.product_id &&
          i.variant_id === guestItem.variant_id,
      );

      const finalQty = (existingItem?.quantity || 0) + guestItem.quantity;

      // Check stock — neu khong du, skip item nay (UX: khong block ca cart merge)
      const inStock = await this.inventoryService.isInStock(
        guestItem.product_id,
        guestItem.variant_id || undefined,
        finalQty,
      );
      if (!inStock) {
        continue;
      }

      // Refresh price tu DB
      let price: number;
      try {
        price = await this.resolvePrice(
          guestItem.product_id,
          guestItem.variant_id,
        );
      } catch {
        // San pham bi xoa/inactive sau khi guest add — bo qua
        continue;
      }

      if (existingItem) {
        existingItem.quantity = finalQty;
        existingItem.price = price;
        await this.cartItemRepository.save(existingItem);
      } else {
        await this.cartItemRepository.save(
          this.cartItemRepository.create({
            cart_id: userCart.id,
            product_id: guestItem.product_id,
            variant_id: guestItem.variant_id,
            quantity: guestItem.quantity,
            price,
            metadata: guestItem.metadata,
          }),
        );
      }
    }

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
    threshold.setDate(threshold.getDate() - 7);

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
