import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity.js';
import { Subscription } from './entities/subscription.entity.js';
import { Usage } from './entities/usage.entity.js';
import { PlansService } from './plans.service.js';
import { PlansController } from './plans.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, Usage])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
