import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Headers,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { TrackPageviewDto } from './dto/track-pageview.dto.js';
import { TrackEventDto } from './dto/track-event.dto.js';
import { QueryAnalyticsDto } from './dto/query-analytics.dto.js';
import {
  RangeQueryDto,
  TopProductsQueryDto,
} from './dto/range-query.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Public — ghi nhan page view.
   */
  @Public()
  @Post('pageview')
  async trackPageview(
    @Body() dto: TrackPageviewDto,
    @Req() req: any,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    const pageView = await this.analyticsService.trackPageView(
      dto,
      ip,
      userAgent || '',
      req.user?.id,
    );
    return successResponse(pageView, 'Page view tracked');
  }

  /**
   * Public — ghi nhan event.
   */
  @Public()
  @Post('event')
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: any) {
    const event = await this.analyticsService.trackEvent(dto, req.user?.id);
    return successResponse(event, 'Event tracked');
  }

  /**
   * Admin — dashboard tong quan.
   */
  @Roles(UserRole.ADMIN)
  @Get('dashboard')
  async getDashboard(@Query() query: QueryAnalyticsDto) {
    const stats = await this.analyticsService.getDashboardStats(query);
    return successResponse(stats);
  }

  /**
   * Admin — thong ke page views.
   */
  @Roles(UserRole.ADMIN)
  @Get('pageviews')
  async getPageViews(@Query() query: QueryAnalyticsDto) {
    const stats = await this.analyticsService.getPageViewStats(
      query,
      query.group_by || 'day',
    );
    return successResponse(stats);
  }

  /**
   * Admin — top trang xem nhieu.
   * Coerce + clamp limit tai service layer de phong truong hop FE gui string.
   */
  @Roles(UserRole.ADMIN)
  @Get('top-pages')
  async getTopPages(
    @Query() query: QueryAnalyticsDto,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 10;
    const safeLimit = Math.max(
      1,
      Math.min(100, Number.isFinite(parsed) ? parsed : 10),
    );
    const pages = await this.analyticsService.getTopPages(query, safeLimit);
    return successResponse(pages);
  }

  /**
   * Admin — thong ke thiet bi.
   */
  @Roles(UserRole.ADMIN)
  @Get('devices')
  async getDevices(@Query() query: QueryAnalyticsDto) {
    const stats = await this.analyticsService.getDeviceStats(query);
    return successResponse(stats);
  }

  /**
   * Admin — bieu do doanh thu.
   */
  @Roles(UserRole.ADMIN)
  @Get('revenue')
  async getRevenue(@Query() query: QueryAnalyticsDto) {
    const chart = await this.analyticsService.getRevenueChart(
      query,
      query.group_by || 'day',
    );
    return successResponse(chart);
  }

  /**
   * Admin — nguon truy cap.
   */
  @Roles(UserRole.ADMIN)
  @Get('sources')
  async getSources(@Query() query: QueryAnalyticsDto) {
    const sources = await this.analyticsService.getTrafficSources(query);
    return successResponse(sources);
  }

  /**
   * Admin — breakdown don hang theo trang thai + % so voi tong.
   * Range filter optional (from/to). Khong truyen → all-time.
   */
  @Roles(UserRole.ADMIN)
  @Get('orders-by-status')
  async getOrdersByStatus(@Query() query: RangeQueryDto) {
    const data = await this.analyticsService.getOrdersByStatus(
      query.from,
      query.to,
    );
    return successResponse(data);
  }

  /**
   * Admin — top san pham ban chay trong khoang thoi gian.
   * limit default 5, toi da 50.
   */
  @Roles(UserRole.ADMIN)
  @Get('top-products')
  async getTopProducts(@Query() query: TopProductsQueryDto) {
    const data = await this.analyticsService.getTopProducts(
      query.from,
      query.to,
      query.limit ?? 5,
    );
    return successResponse(data);
  }
}
