import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../common/constants/index.js';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';

/**
 * Orders service — tao don hang tu cart hoac truc tiep, quan ly trang thai don hang.
 */
@Injectable()
export class OrdersService extends BaseService<Order> {
  protected searchableFields = ['order_number'];
  protected defaultSort = 'created_at';

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {
    super(ordersRepository, 'Order');
  }

  /**
   * Tao don hang tu gio hang.
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

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = await this.create({
      order_number: await this.generateOrderNumber(),
      user_id: userId,
      status: OrderStatus.PENDING,
      subtotal,
      total: subtotal + (dto.shipping_address ? 0 : 0), // Shipping fee logic
      shipping_address: dto.shipping_address,
      billing_address: dto.billing_address || null,
      note: dto.note || null,
      promotion_code: dto.promotion_code || null,
    } as any);

    // Tao order items
    const items = cartItems.map((item) =>
      this.orderItemRepository.create({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        variant_name: item.variant_name || null,
        sku: item.sku || null,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        image_url: item.image_url || null,
      }),
    );

    order.items = await this.orderItemRepository.save(items);
    return order;
  }

  /**
   * Tao don hang truc tiep (khong qua cart).
   */
  async createDirect(userId: string, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order items are required');
    }

    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = await this.create({
      order_number: await this.generateOrderNumber(),
      user_id: userId,
      status: OrderStatus.PENDING,
      subtotal,
      total: subtotal,
      shipping_address: dto.shipping_address,
      billing_address: dto.billing_address || null,
      note: dto.note || null,
      promotion_code: dto.promotion_code || null,
    } as any);

    const items = dto.items.map((item) =>
      this.orderItemRepository.create({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        variant_name: item.variant_name || null,
        sku: item.sku || null,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        image_url: item.image_url || null,
      }),
    );

    order.items = await this.orderItemRepository.save(items);
    return order;
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
   * Huy don hang.
   */
  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const order = await this.findById(id);

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}"`,
      );
    }

    return this.updateStatus(id, OrderStatus.CANCELLED, reason);
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
