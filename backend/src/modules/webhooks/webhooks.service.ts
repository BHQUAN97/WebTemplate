import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseService } from '../../common/services/base.service.js';
import { Webhook } from './entities/webhook.entity.js';
import { WebhookDelivery } from './entities/webhook-delivery.entity.js';
import { CreateWebhookDto } from './dto/create-webhook.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaginationMeta } from '../../common/utils/response.js';
import { QUEUE_NAMES } from '../../common/queue/queue.module.js';
import { WebhookJobData } from '../../common/queue/webhook.processor.js';

/**
 * Danh sach events kha dung cho webhook.
 */
export const AVAILABLE_EVENTS = [
  'order.created',
  'order.updated',
  'order.cancelled',
  'order.completed',
  'payment.received',
  'payment.refunded',
  'product.created',
  'product.updated',
  'product.deleted',
  'user.registered',
  'user.updated',
  'inventory.low',
  'review.created',
] as const;

/**
 * Quan ly webhooks — CRUD + dispatch event sang queue.
 * Viec deliver thuc te (fetch + log + SSRF guard) nam o WebhookProcessor.
 */
@Injectable()
export class WebhooksService extends BaseService<Webhook> {
  protected searchableFields = ['url', 'description'];

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectQueue(QUEUE_NAMES.WEBHOOK)
    private readonly webhookQueue: Queue<WebhookJobData>,
  ) {
    super(webhookRepo, 'Webhook');
  }

  /**
   * Tao webhook moi — tu dong sinh secret neu khong cung cap.
   */
  async createWebhook(
    tenantId: string,
    dto: CreateWebhookDto,
  ): Promise<Webhook> {
    return this.create({
      tenant_id: tenantId,
      url: dto.url,
      events: dto.events,
      description: dto.description || null,
      secret: dto.secret || randomBytes(32).toString('hex'),
    } as any);
  }

  /**
   * Trigger event — tim webhook match va enqueue deliver job cho moi cai.
   * Bull se retry 3 lan voi exponential backoff neu fail.
   */
  async trigger(
    event: string,
    payload: Record<string, any>,
    tenantId?: string,
  ): Promise<{ queued: number; jobIds: string[] }> {
    const qb = this.webhookRepo
      .createQueryBuilder('w')
      .where('w.is_active = :active', { active: true })
      .andWhere('w.deleted_at IS NULL');

    if (tenantId) {
      qb.andWhere('w.tenant_id = :tenantId', { tenantId });
    }

    const webhooks = await qb.getMany();

    // Loc webhook co event phu hop
    const matched = webhooks.filter((w) => w.events.includes(event));

    const jobIds: string[] = [];
    for (const webhook of matched) {
      const job = await this.webhookQueue.add('deliver', {
        webhookId: webhook.id,
        event,
        payload,
      });
      if (job.id) jobIds.push(job.id);
    }

    this.logger.log(
      `Triggered "${event}" → ${matched.length} webhook(s) queued`,
    );
    return { queued: matched.length, jobIds };
  }

  /**
   * Retry thu cong 1 delivery that bai — enqueue lai job moi.
   */
  async retry(deliveryId: string): Promise<{ jobId: string | undefined }> {
    const delivery = await this.deliveryRepo.findOne({
      where: { id: deliveryId },
    });
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const payload = (delivery.payload as any)?.data ?? delivery.payload;
    const job = await this.webhookQueue.add('deliver', {
      webhookId: delivery.webhook_id,
      event: delivery.event,
      payload,
    });
    return { jobId: job.id };
  }

  /**
   * Lay danh sach deliveries cua 1 webhook, co phan trang.
   */
  async getDeliveries(
    webhookId: string,
    options: PaginationDto,
  ): Promise<{ items: WebhookDelivery[]; meta: PaginationMeta }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.deliveryRepo.findAndCount({
      where: { webhook_id: webhookId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lay cac webhook cua 1 tenant.
   */
  async getByTenant(tenantId: string): Promise<Webhook[]> {
    return this.webhookRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Tao HMAC-SHA256 signature cho payload.
   * Giu lai de consumer code con goi duoc (neu can).
   */
  generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
