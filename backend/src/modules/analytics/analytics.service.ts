import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageView } from './entities/page-view.entity.js';
import { Event } from './entities/event.entity.js';
import { TrackPageviewDto } from './dto/track-pageview.dto.js';
import { TrackEventDto } from './dto/track-event.dto.js';
import { QueryAnalyticsDto } from './dto/query-analytics.dto.js';

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
}
