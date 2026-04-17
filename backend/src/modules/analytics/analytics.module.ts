import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageView } from './entities/page-view.entity.js';
import { Event } from './entities/event.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsProcessor } from '../../common/queue/analytics.processor.js';

/**
 * AnalyticsModule.
 * Queue `analytics` da duoc register o QueueModule (@Global), khong can register lai.
 * AnalyticsProcessor dang ky tai day de co access den AnalyticsService injected.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PageView, Event, Order, OrderItem, Product]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProcessor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
