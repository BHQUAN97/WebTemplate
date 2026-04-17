import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { WebhooksService, AVAILABLE_EVENTS } from './webhooks.service.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { UpdateWebhookDto } from './dto/update-webhook.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

/**
 * Webhooks — admin-only CRUD. Tat ca endpoints yeu cau role ADMIN de tranh
 * cross-tenant write va exfiltration qua SSRF delivery URLs.
 */
@Roles(UserRole.ADMIN)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Tao webhook moi cho tenant.
   */
  @Post()
  async create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const webhook = await this.webhooksService.createWebhook(
      user.tenantId!,
      dto,
    );
    return successResponse(webhook, 'Webhook created');
  }

  /**
   * Lay danh sach webhook cua tenant.
   */
  @Get()
  async getByTenant(@CurrentUser() user: ICurrentUser) {
    const webhooks = await this.webhooksService.getByTenant(user.tenantId!);
    return successResponse(webhooks);
  }

  /**
   * Lay danh sach events kha dung.
   */
  @Get('events')
  async getEvents() {
    return successResponse(AVAILABLE_EVENTS);
  }

  /**
   * Lay chi tiet 1 webhook. Verify tenant cua caller match webhook tenant.
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    const webhook = await this.webhooksService.findById(id);
    if (webhook.tenant_id !== user.tenantId) {
      throw new ForbiddenException('Webhook thuộc tenant khác');
    }
    return successResponse(webhook);
  }

  /**
   * Cap nhat webhook (same tenant only).
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const existing = await this.webhooksService.findById(id);
    if (existing.tenant_id !== user.tenantId) {
      throw new ForbiddenException('Webhook thuộc tenant khác');
    }
    const webhook = await this.webhooksService.update(id, dto as any);
    return successResponse(webhook, 'Webhook updated');
  }

  /**
   * Xoa webhook (same tenant only).
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    const existing = await this.webhooksService.findById(id);
    if (existing.tenant_id !== user.tenantId) {
      throw new ForbiddenException('Webhook thuộc tenant khác');
    }
    await this.webhooksService.softDelete(id);
    return successResponse(null, 'Webhook deleted');
  }

  /**
   * Lay danh sach deliveries cua 1 webhook (same tenant only).
   */
  @Get(':id/deliveries')
  async getDeliveries(
    @Param('id') id: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const existing = await this.webhooksService.findById(id);
    if (existing.tenant_id !== user.tenantId) {
      throw new ForbiddenException('Webhook thuộc tenant khác');
    }
    const { items, meta } = await this.webhooksService.getDeliveries(id, query);
    return paginatedResponse(items, meta);
  }

  /**
   * Gui test event den webhook (same tenant only).
   */
  @Post(':id/test')
  async test(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    const webhook = await this.webhooksService.findById(id);
    if (webhook.tenant_id !== user.tenantId) {
      throw new ForbiddenException('Webhook thuộc tenant khác');
    }
    const deliveries = await this.webhooksService.trigger(
      'test.ping',
      { message: 'This is a test webhook delivery', timestamp: new Date().toISOString() },
      webhook.tenant_id,
    );
    return successResponse(deliveries, 'Test webhook sent');
  }

  /**
   * POST /webhooks/deliveries/:id/replay — admin replay 1 delivery.
   * Re-enqueue job voi same payload -> deliver lai.
   */
  @Post('deliveries/:id/replay')
  @HttpCode(202)
  @Roles(UserRole.ADMIN)
  async replayDelivery(@Param('id') id: string) {
    const result = await this.webhooksService.retry(id);
    return successResponse(result, 'Delivery replay accepted');
  }
}
