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
   */
  @Roles(UserRole.ADMIN)
  @Get('top-pages')
  async getTopPages(
    @Query() query: QueryAnalyticsDto,
    @Query('limit') limit?: number,
  ) {
    const pages = await this.analyticsService.getTopPages(query, limit || 10);
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
}
