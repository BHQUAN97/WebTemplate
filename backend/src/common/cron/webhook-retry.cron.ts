import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { WebhookDelivery } from '../../modules/webhooks/entities/webhook-delivery.entity.js';
import { QUEUE_NAMES } from '../queue/queue.module.js';
import { WebhookJobData } from '../queue/webhook.processor.js';
import { DeadLetterService } from '../queue/dead-letter.service.js';
import { REDIS_CLIENT } from '../redis/redis.module.js';

/**
 * Max attempts truoc khi move vao DLQ.
 */
const MAX_WEBHOOK_ATTEMPTS = 5;

/**
 * Cron webhook-retry — chay moi 10 phut.
 * Logic:
 *  - Tim deliveries success=false AND attempt < MAX_ATTEMPTS AND next_retry_at <= NOW
 *    -> re-enqueue tai queue webhook.
 *  - Deliveries success=false AND attempt >= MAX_ATTEMPTS -> move vao DLQ + mark special.
 */
@Injectable()
export class WebhookRetryCron {
  private readonly logger = new Logger(WebhookRetryCron.name);

  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveryRepo: Repository<WebhookDelivery>,
    @InjectQueue(QUEUE_NAMES.WEBHOOK)
    private readonly webhookQueue: Queue<WebhookJobData>,
    private readonly dlqService: DeadLetterService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Cron('*/10 * * * *', { name: 'webhook-retry' })
  async retry(): Promise<void> {
    // Distributed lock — chong 2 instance cung chay cron retry duplicate webhook.
    // SET NX EX cho atomic acquire + auto-release sau 9 phut (cron interval 10').
    const lockKey = 'cron:webhook-retry:lock';
    const acquired = await this.redis.set(lockKey, '1', 'EX', 540, 'NX');
    if (acquired !== 'OK') {
      this.logger.debug('Webhook retry skipped — another instance holds lock');
      return;
    }

    try {
      const now = new Date();

      // Tim deliveries can retry — success=false, chua vuot max attempts, den luc retry
      const toRetry = await this.deliveryRepo
        .createQueryBuilder('d')
        .where('d.success = :s', { s: false })
        .andWhere('d.attempt < :max', { max: MAX_WEBHOOK_ATTEMPTS })
        .andWhere('(d.next_retry_at IS NULL OR d.next_retry_at <= :now)', {
          now,
        })
        .orderBy('d.created_at', 'ASC')
        .limit(200)
        .getMany();

      let enqueued = 0;
      for (const d of toRetry) {
        const payload = (d.payload as any)?.data ?? d.payload;
        const event = d.event;
        await this.webhookQueue.add('deliver', {
          webhookId: d.webhook_id,
          event,
          payload,
        });
        // Reset next_retry_at de tranh pick lai row nay trong lan cron sau;
        // lan deliver moi se ghi delivery record moi voi backoff moi.
        d.next_retry_at = null;
        await this.deliveryRepo.save(d);
        enqueued += 1;
      }

      // Tim deliveries fail vinh vien — chuyen DLQ, set next_retry_at = null + attempt = MAX
      const exhausted = await this.deliveryRepo
        .createQueryBuilder('d')
        .where('d.success = :s', { s: false })
        .andWhere('d.attempt >= :max', { max: MAX_WEBHOOK_ATTEMPTS })
        .andWhere('d.next_retry_at IS NOT NULL')
        .orderBy('d.created_at', 'ASC')
        .limit(100)
        .getMany();

      let dlqed = 0;
      for (const d of exhausted) {
        try {
          await this.dlqService.moveToDlq({
            originalQueue: QUEUE_NAMES.WEBHOOK,
            originalJobName: 'deliver',
            originalJobId: d.id,
            payload: {
              webhookId: d.webhook_id,
              event: d.event,
              payload: (d.payload as any)?.data ?? d.payload,
            },
            error: d.response_body || 'Exhausted retry attempts',
            attemptsMade: d.attempt,
            failedAt: new Date().toISOString(),
          });
          // Clear next_retry_at de khong xet lai
          d.next_retry_at = null;
          await this.deliveryRepo.save(d);
          dlqed += 1;
        } catch (err) {
          this.logger.error(
            `DLQ move failed for delivery ${d.id}: ${(err as Error).message}`,
          );
        }
      }

      if (enqueued + dlqed > 0) {
        this.logger.log(
          `Webhook retry cron: enqueued=${enqueued} dlqed=${dlqed}`,
        );
      }
    } catch (err) {
      this.logger.error(`Webhook retry cron failed: ${(err as Error).message}`);
    }
  }
}
