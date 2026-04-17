import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './entities/webhook.entity.js';
import { WebhookDelivery } from './entities/webhook-delivery.entity.js';
import { WebhooksService } from './webhooks.service.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhookProcessor } from '../../common/queue/webhook.processor.js';

/**
 * WebhooksModule — CRUD webhook + enqueue delivery qua BullMQ.
 * WebhookProcessor dang ky o day de co access den repo.
 * QueueModule @Global da dang ky queue "webhook" roi.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Webhook, WebhookDelivery])],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
