import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PlansService } from './plans.service.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import {
  successResponse,
  paginatedResponse,
} from '../../common/utils/response.js';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * Danh sach plan active (public).
   */
  @Get()
  @Public()
  async getActivePlans() {
    const plans = await this.plansService.getActivePlans();
    return successResponse(plans);
  }

  /**
   * Tao plan moi (admin only).
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreatePlanDto) {
    const plan = await this.plansService.create(dto as any);
    return successResponse(plan, 'Plan created');
  }

  /**
   * Cap nhat plan (admin only).
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    const plan = await this.plansService.update(id, dto as any);
    return successResponse(plan, 'Plan updated');
  }

  /**
   * Dang ky plan cho tenant hien tai.
   */
  @Post('subscribe')
  async subscribe(
    @Body() dto: SubscribeDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const subscription = await this.plansService.subscribe(
      user.tenantId!,
      dto.plan_id,
    );
    return successResponse(subscription, 'Subscribed successfully');
  }

  /**
   * Huy subscription hien tai.
   */
  @Post('cancel')
  async cancel(
    @Body() body: { subscription_id: string; reason?: string },
    @CurrentUser() user: ICurrentUser,
  ) {
    const subscription = await this.plansService.cancel(
      body.subscription_id,
      body.reason,
    );
    return successResponse(subscription, 'Subscription cancelled');
  }

  /**
   * Lay subscription hien tai cua tenant.
   */
  @Get('subscription')
  async getSubscription(@CurrentUser() user: ICurrentUser) {
    const subscription = await this.plansService.getSubscription(
      user.tenantId!,
    );
    return successResponse(subscription);
  }

  /**
   * Lay usage hien tai cua tenant.
   */
  @Get('usage')
  async getUsage(@CurrentUser() user: ICurrentUser) {
    const metrics = ['products', 'storage_bytes', 'users', 'api_calls'];
    const usage: Record<string, any> = {};
    for (const metric of metrics) {
      usage[metric] = await this.plansService.checkUsage(
        user.tenantId!,
        metric,
      );
    }
    return successResponse(usage);
  }
}
