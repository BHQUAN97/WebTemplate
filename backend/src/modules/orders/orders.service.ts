import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder, In } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../common/constants/index.js';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';

/**
 * Orders service — tao don hang tu cart hoac truc tiep, quan ly trang thai don hang.
 * Reserve ton kho + ap dung promotion atomic. Huy don releases stock + revokes promo.
 */
@Injectable()
export class OrdersService extends BaseService<Order> {
  protected searchableFields = ['order_number'];
  protected defaultSort = 'created_at';
  private readonly log = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly inventoryService: InventoryService,
    private readonly promotionsService: PromotionsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(ordersRepository, 'Order');
  }

  /**
   * Tao don hang tu gio hang.
   * cartItems da co price snapshot tu CartService — tin DB price, KHONG tin client.
   */
  async createFromCart(
    userId: string,
    dto: CreateOrderDto,
    cartItems: Array<{
      product_id: string;
      variant_id?: string | null;
      product_name: string;
      variant_name?: string | null;
      sku?: string | null;
      price: number;
      quantity: number;
      image_url?: string | null;
    }>,
  ): Promise<Order> {
    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return this.createOrderInternal(
      userId,
      dto,
      cartItems.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        product_name: i.product_name,
        variant_name: i.variant_name || null,
        sku: i.sku || null,
        price: Number(i.price),
        quantity: Number(i.quantity),
        total: Number(i.price) * Number(i.quantity),
        image_url: i.image_url || null,
      })),
    );
  }

  /**
   * Tao don hang truc tiep (khong qua cart).
   * Gia + ten LAY TU DB — chong gian lan price/name manipulation tu client.
   */
  async createDirect(userId: string, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order items are required');
    }

    const productIds = Array.from(new Set(dto.items.map((i) => i.product_id)));
    const variantIds = Array.from(
      new Set(
        dto.items.map((i) => i.variant_id).filter((v): v is string => !!v),
      ),
    );

    const products = await this.productRepository.find({
      where: { id: In(productIds) },
    });
    const variants = variantIds.length
      ? await this.variantRepository.find({ where: { id: In(variantIds) } })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const resolvedItems = dto.items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new BadRequestException(
          `Product ${item.product_id} not found or unavailable`,
        );
      }

      let price: number = Number(product.price);
      let variantName: string | null = null;
      let sku: string | null = (product as any).sku ?? null;

      if (item.variant_id) {
        const variant = variantMap.get(item.variant_id);
        if (!variant || variant.product_id !== product.id) {
          throw new BadRequestException(
            `Variant ${item.variant_id} not valid for product ${product.id}`,
          );
        }
        price = Number(variant.price);
        variantName = (variant as any).name ?? null;
        sku = (variant as any).sku ?? sku;
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException(
          `Invalid price for product ${product.id}`,
        );
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException(
          `Invalid quantity for product ${product.id}`,
        );
      }

      return {
        product_id: product.id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        variant_name: variantName,
        sku,
        price,
        quantity: item.quantity,
        total: price * item.quantity,
        image_url: (product as any).images?.[0]?.url ?? null,
      };
    });

    return this.createOrderInternal(userId, dto, resolvedItems);
  }

  /**
   * Internal: reserve stock atomic, ap dung promotion, tinh total dung cong thuc,
   * tao order + items. Rollback stock neu fail giua chung.
   */
  private async createOrderInternal(
    userId: string,
    dto: CreateOrderDto,
    items: Array<{
      product_id: string;
      variant_id: string | null;
      product_name: string;
      variant_name: string | null;
      sku: string | null;
      price: number;
      quantity: number;
      total: number;
      image_url: string | null;
    }>,
  ): Promise<Order> {
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const shippingFee = 0; // TODO: tinh theo dia chi/method khi co shipping module
    const taxAmount = 0; // TODO: tinh theo region khi co tax module

    // 1) Reserve stock TRUOC khi tao order — neu fail, khong tao order
    const reserved: Array<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }> = [];
    try {
      for (const item of items) {
        await this.inventoryService.reserveStock(
          item.product_id,
          item.quantity,
          item.variant_id || undefined,
        );
        reserved.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        });
      }
    } catch (err) {
      // Rollback nhung stock da reserve
      await this.releaseReserved(reserved);
      throw err;
    }

    // 2) Reserve promotion slot + tinh discount (chua ghi usage)
    let discountAmount = 0;
    let reservedPromotionId: string | null = null;
    if (dto.promotion_code) {
      try {
        const result = await this.promotionsService.reserveAndCalculate(
          dto.promotion_code,
          userId,
          subtotal,
        );
        discountAmount = Number(result.discount_amount) || 0;
        reservedPromotionId = result.promotion.id;
      } catch (err) {
        await this.releaseReserved(reserved);
        throw err;
      }
    }

    // 3) Tinh total = subtotal - discount + shipping + tax (khong duoi 0)
    const total = Math.max(0, subtotal - discountAmount + shippingFee + taxAmount);

    // 4) Tao order + items + ghi promo usage trong 1 DB transaction —
    //    neu bat ky buoc nao fail, rollback ca don.
    const orderNumber = await this.generateOrderNumber();
    let order: Order;
    try {
      order = await this.dataSource.transaction(async (manager) => {
        const orderRepo = manager.getRepository(Order);
        const itemRepo = manager.getRepository(OrderItem);

        const newOrder: Order = orderRepo.create({
          order_number: orderNumber,
          user_id: userId,
          status: OrderStatus.PENDING,
          subtotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          tax_amount: taxAmount,
          total,
          shipping_address: dto.shipping_address,
          billing_address: dto.billing_address || null,
          note: dto.note || null,
          promotion_code: dto.promotion_code || null,
        } as Partial<Order>);
        const saved: Order = await orderRepo.save(newOrder);

        const orderItems: OrderItem[] = items.map((item) =>
          itemRepo.create({
            order_id: saved.id,
            ...item,
          } as Partial<OrderItem>),
        );
        saved.items = await itemRepo.save(orderItems);
        return saved;
      });
    } catch (err) {
      await this.releaseReserved(reserved);
      if (reservedPromotionId) {
        await this.promotionsService
          .releaseSlot(reservedPromotionId)
          .catch(() => {});
      }
      throw err;
    }

    // 5) Ghi nhan promotion usage voi order.id thuc te.
    // Neu fail: release slot de tranh orphan reservation (slot bi tinh ma khong co usage record).
    if (reservedPromotionId) {
      try {
        await this.promotionsService.recordUsage(
          reservedPromotionId,
          order.id,
          userId,
          discountAmount,
        );
      } catch (err) {
        this.log.warn(
          `Failed to record promotion usage for order ${order.id}: ${(err as Error).message}`,
        );
        // Tra slot ve de tranh consume slot ma khong co usage record
        await this.promotionsService
          .releaseSlot(reservedPromotionId)
          .catch((e: Error) =>
            this.log.warn(
              `Failed to release orphan slot for ${reservedPromotionId}: ${e.message}`,
            ),
          );
      }
    }

    return order;
  }

  /**
   * Release stock cho danh sach reserved — best-effort, khong throw.
   */
  private async releaseReserved(
    reserved: Array<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }>,
  ): Promise<void> {
    for (const r of reserved) {
      await this.inventoryService
        .releaseStock(r.product_id, r.quantity, r.variant_id || undefined)
        .catch((err: Error) =>
          this.log.warn(
            `Failed to release stock for ${r.product_id}: ${err.message}`,
          ),
        );
    }
  }

  /**
   * Cap nhat trang thai don hang.
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    reason?: string,
  ): Promise<Order> {
    const order = await this.findById(id);

    const updateData: any = { status };

    if (status === OrderStatus.CANCELLED && reason) {
      updateData.cancelled_reason = reason;
    }

    if (status === OrderStatus.SHIPPING) {
      updateData.shipped_at = new Date();
    }

    if (status === OrderStatus.DELIVERED) {
      updateData.delivered_at = new Date();
    }

    return this.update(id, updateData);
  }

  /**
   * Tao ma don hang tu dong: ORD-YYYYMMDD-XXXX.
   */
  async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.ordersRepository
      .createQueryBuilder('o')
      .where('o.order_number LIKE :prefix', { prefix: `ORD-${dateStr}-%` })
      .getCount();
    const seq = String(count + 1).padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
  }

  /**
   * Lay don hang kem chi tiet items.
   */
  async getOrderWithItems(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id, deleted_at: null as any },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  /**
   * Lay danh sach don hang cua user (phan trang).
   */
  async getUserOrders(
    userId: string,
    options: PaginationDto,
  ): Promise<{ items: Order[]; meta: any }> {
    const queryOptions = { ...options, user_id: userId } as QueryOrdersDto;
    return this.findAll(queryOptions);
  }

  /**
   * Thong ke don hang theo khoang thoi gian.
   */
  async getOrderStats(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    total_orders: number;
    total_revenue: number;
    by_status: Record<string, number>;
  }> {
    const qb = this.ordersRepository
      .createQueryBuilder('o')
      .where('o.deleted_at IS NULL');

    if (dateFrom) {
      qb.andWhere('o.created_at >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('o.created_at <= :dateTo', { dateTo });
    }

    const orders = await qb.getMany();
    const byStatus: Record<string, number> = {};

    let totalRevenue = 0;
    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      totalRevenue += Number(order.total);
    }

    return {
      total_orders: orders.length,
      total_revenue: totalRevenue,
      by_status: byStatus,
    };
  }

  /**
   * Huy don hang: cap nhat status TRUOC (atomic check-and-update theo status hien tai),
   * sau do release ton kho + revoke promo (compensation actions, log neu fail).
   * Order DELIVERED/CANCELLED khong cho huy.
   */
  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const order = await this.getOrderWithItems(id);

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}"`,
      );
    }

    // Atomic status update: chi UPDATE neu status van la status hien tai (chong race
    // khi 2 request cung cancel hoac cancel + admin update status cung luc).
    const updateData: any = {
      status: OrderStatus.CANCELLED,
      cancelled_reason: reason || null,
    };
    const result = await this.ordersRepository
      .createQueryBuilder()
      .update(Order)
      .set(updateData)
      .where('id = :id', { id })
      .andWhere('status = :status', { status: order.status })
      .execute();

    if (!result.affected) {
      // Status da bi thay doi boi request khac
      throw new BadRequestException(
        'Order status changed concurrently — please refresh',
      );
    }

    // Release stock + revoke promo — compensation actions, log fail nhung khong throw
    for (const item of order.items || []) {
      await this.inventoryService
        .releaseStock(
          item.product_id,
          item.quantity,
          item.variant_id || undefined,
        )
        .catch((err: Error) =>
          this.log.warn(
            `Failed to release stock for order ${id} item ${item.id}: ${err.message}`,
          ),
        );
    }

    if (order.promotion_code) {
      await this.promotionsService
        .revokeForOrder(order.id)
        .catch((err: Error) =>
          this.log.warn(
            `Failed to revoke promotion for order ${id}: ${err.message}`,
          ),
        );
    }

    return this.findById(id);
  }

  /**
   * Override applyFilters — loc theo status, ngay, user, ma don.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Order>,
    options: PaginationDto,
  ): void {
    const query = options as QueryOrdersDto;

    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }

    if (query.user_id) {
      qb.andWhere('entity.user_id = :userId', { userId: query.user_id });
    }

    if (query.date_from) {
      qb.andWhere('entity.created_at >= :dateFrom', {
        dateFrom: query.date_from,
      });
    }

    if (query.date_to) {
      qb.andWhere('entity.created_at <= :dateTo', {
        dateTo: query.date_to,
      });
    }

    if (query.order_number) {
      qb.andWhere('entity.order_number LIKE :orderNumber', {
        orderNumber: `%${query.order_number}%`,
      });
    }
  }
}
