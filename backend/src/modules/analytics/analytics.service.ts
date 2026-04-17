import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageView } from './entities/page-view.entity.js';
import { Event } from './entities/event.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { TrackPageviewDto } from './dto/track-pageview.dto.js';
import { TrackEventDto } from './dto/track-event.dto.js';
import { QueryAnalyticsDto } from './dto/query-analytics.dto.js';

/**
 * Ket qua breakdown theo trang thai don hang.
 */
export interface OrderStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

/**
 * Ket qua top product — san pham ban chay.
 */
export interface TopProductRow {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  soldQty: number;
  revenue: number;
  orderCount: number;
}

/**
 * Analytics service — tracking page views, events, dashboard stats.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger('AnalyticsService');

  constructor(
    @InjectRepository(PageView)
    private readonly pageViewRepository: Repository<PageView>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Ghi nhan luot xem trang.
   */
  async trackPageView(
    dto: TrackPageviewDto,
    ip: string,
    userAgent: string,
    userId?: string,
  ): Promise<PageView> {
    const pageView = this.pageViewRepository.create({
      page_url: dto.page_url,
      page_title: dto.page_title || null,
      session_id: dto.session_id,
      referer: dto.referer || null,
      ip_address: ip,
      user_agent: userAgent,
      user_id: userId || null,
      device_type: this.detectDeviceType(userAgent),
    });
    return this.pageViewRepository.save(pageView);
  }

  /**
   * Ghi nhan event (product_view, add_to_cart, v.v.).
   */
  async trackEvent(dto: TrackEventDto, userId?: string): Promise<Event> {
    const event = this.eventRepository.create({
      name: dto.name as any,
      session_id: dto.session_id,
      data: dto.data || null,
      user_id: userId || null,
    });
    return this.eventRepository.save(event);
  }

  /**
   * Thong ke tong quan cho dashboard admin.
   */
  async getDashboardStats(dateRange: QueryAnalyticsDto) {
    const { date_from, date_to } = dateRange;

    const [pageviews, uniqueSessions, events] = await Promise.all([
      this.pageViewRepository
        .createQueryBuilder('pv')
        .where('pv.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
        .getCount(),
      this.pageViewRepository
        .createQueryBuilder('pv')
        .select('COUNT(DISTINCT pv.session_id)', 'count')
        .where('pv.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
        .getRawOne(),
      this.eventRepository
        .createQueryBuilder('e')
        .where('e.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
        .getCount(),
    ]);

    return {
      pageviews,
      unique_sessions: parseInt(uniqueSessions?.count || '0'),
      events,
    };
  }

  /**
   * Thong ke page view theo thoi gian (group by day/week/month).
   */
  async getPageViewStats(dateRange: QueryAnalyticsDto, groupBy: string = 'day') {
    const { date_from, date_to } = dateRange;
    const dateFormat = this.getDateFormat(groupBy);

    const rows = await this.pageViewRepository
      .createQueryBuilder('pv')
      .select(`DATE_FORMAT(pv.created_at, '${dateFormat}')`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('pv.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return rows;
  }

  /**
   * Top trang duoc xem nhieu nhat.
   */
  async getTopPages(dateRange: QueryAnalyticsDto, limit: number = 10) {
    const { date_from, date_to } = dateRange;

    return this.pageViewRepository
      .createQueryBuilder('pv')
      .select('pv.page_url', 'page_url')
      .addSelect('pv.page_title', 'page_title')
      .addSelect('COUNT(*)', 'views')
      .where('pv.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
      .groupBy('pv.page_url')
      .addGroupBy('pv.page_title')
      .orderBy('views', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  /**
   * Thong ke theo loai thiet bi.
   */
  async getDeviceStats(dateRange: QueryAnalyticsDto) {
    const { date_from, date_to } = dateRange;

    return this.pageViewRepository
      .createQueryBuilder('pv')
      .select('pv.device_type', 'device_type')
      .addSelect('COUNT(*)', 'count')
      .where('pv.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
      .groupBy('pv.device_type')
      .getRawMany();
  }

  /**
   * Bieu do doanh thu theo thoi gian (dua tren event 'purchase').
   */
  async getRevenueChart(dateRange: QueryAnalyticsDto, groupBy: string = 'day') {
    const { date_from, date_to } = dateRange;
    const dateFormat = this.getDateFormat(groupBy);

    return this.eventRepository
      .createQueryBuilder('e')
      .select(`DATE_FORMAT(e.created_at, '${dateFormat}')`, 'period')
      .addSelect("SUM(JSON_EXTRACT(e.data, '$.amount'))", 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('e.name = :name', { name: 'purchase' })
      .andWhere('e.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();
  }

  /**
   * Thong ke nguon truy cap (referer).
   */
  async getTrafficSources(dateRange: QueryAnalyticsDto) {
    const { date_from, date_to } = dateRange;

    return this.pageViewRepository
      .createQueryBuilder('pv')
      .select('pv.referer', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('pv.created_at BETWEEN :from AND :to', { from: date_from, to: date_to })
      .andWhere('pv.referer IS NOT NULL')
      .groupBy('pv.referer')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();
  }

  /**
   * Phat hien loai thiet bi tu user agent.
   */
  detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | null {
    if (!userAgent) return null;
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(ua)) return 'mobile';
    return 'desktop';
  }

  /**
   * Format date cho group by.
   */
  private getDateFormat(groupBy: string): string {
    switch (groupBy) {
      case 'week':
        return '%Y-%u';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * Thong ke don hang theo trang thai — dem va tinh % so voi tong.
   * @param from ISO date (optional) — neu khong co thi khong filter lower bound
   * @param to   ISO date (optional) — neu khong co thi khong filter upper bound
   */
  async getOrdersByStatus(
    from?: string,
    to?: string,
  ): Promise<OrderStatusBreakdown[]> {
    const qb = this.orderRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.deleted_at IS NULL');

    if (from && to) {
      qb.andWhere('o.created_at BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.andWhere('o.created_at >= :from', { from });
    } else if (to) {
      qb.andWhere('o.created_at <= :to', { to });
    }

    const rows = await qb.groupBy('o.status').getRawMany<{
      status: string;
      count: string;
    }>();

    // Tinh total de xac dinh %
    const total = rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return rows.map((r) => {
      const count = parseInt(r.count, 10);
      const percentage = total > 0 ? Math.round((count / total) * 10000) / 100 : 0;
      return { status: r.status, count, percentage };
    });
  }

  /**
   * Top san pham ban chay — group theo product_id, SUM quantity va revenue.
   * Join products de lay name/slug/image va dem so don hang unique.
   */
  async getTopProducts(
    from?: string,
    to?: string,
    limit: number = 5,
  ): Promise<TopProductRow[]> {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 5));

    const qb = this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('orders', 'o', 'o.id = oi.order_id')
      .leftJoin('products', 'p', 'p.id = oi.product_id')
      .select('oi.product_id', 'productId')
      .addSelect('SUM(oi.quantity)', 'soldQty')
      .addSelect('SUM(oi.quantity * oi.price)', 'revenue')
      .addSelect('COUNT(DISTINCT oi.order_id)', 'orderCount')
      .addSelect('p.name', 'name')
      .addSelect('p.slug', 'slug')
      .addSelect('p.images', 'images')
      .where('o.deleted_at IS NULL')
      .andWhere('oi.deleted_at IS NULL');

    if (from && to) {
      qb.andWhere('o.created_at BETWEEN :from AND :to', { from, to });
    } else if (from) {
      qb.andWhere('o.created_at >= :from', { from });
    } else if (to) {
      qb.andWhere('o.created_at <= :to', { to });
    }

    const rows = await qb
      .groupBy('oi.product_id')
      .addGroupBy('p.name')
      .addGroupBy('p.slug')
      .addGroupBy('p.images')
      .orderBy('soldQty', 'DESC')
      .limit(safeLimit)
      .getRawMany<{
        productId: string;
        name: string | null;
        slug: string | null;
        images: string | null;
        soldQty: string;
        revenue: string;
        orderCount: string;
      }>();

    // Trich anh dau tien tu field images (JSON array)
    return rows.map((r) => ({
      productId: r.productId,
      name: r.name ?? '',
      slug: r.slug ?? '',
      image: this.extractFirstImage(r.images),
      soldQty: parseInt(r.soldQty, 10) || 0,
      revenue: parseFloat(r.revenue) || 0,
      orderCount: parseInt(r.orderCount, 10) || 0,
    }));
  }

  /**
   * Parse JSON images field va tra ve URL anh dau tien.
   * MySQL json co the tra ve string (khi dung getRawMany) hoac object.
   */
  private extractFirstImage(images: string | null | any[]): string | null {
    if (!images) return null;
    try {
      const arr = typeof images === 'string' ? JSON.parse(images) : images;
      if (Array.isArray(arr) && arr.length > 0 && arr[0]?.url) {
        return arr[0].url;
      }
    } catch {
      // ignore malformed json
    }
    return null;
  }
}
