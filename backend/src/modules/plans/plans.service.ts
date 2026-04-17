import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Plan, PlanFeatures } from './entities/plan.entity.js';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity.js';
import { Usage } from './entities/usage.entity.js';

/**
 * Quan ly plans, subscriptions va usage tracking.
 * Ho tro subscribe/cancel/renew, kiem tra usage so voi plan limits.
 */
@Injectable()
export class PlansService extends BaseService<Plan> {
  protected searchableFields = ['name', 'slug'];

  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Usage)
    private readonly usageRepo: Repository<Usage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(planRepo, 'Plan');
  }

  /**
   * Lay danh sach plan dang active, sap xep theo sort_order.
   */
  async getActivePlans(): Promise<Plan[]> {
    return this.planRepo.find({
      where: { is_active: true, deleted_at: IsNull() },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Dang ky tenant vao 1 plan. Huy subscription cu neu co.
   */
  async subscribe(tenantId: string, planId: string): Promise<Subscription> {
    const plan = await this.findById(planId);

    // Huy subscription hien tai neu co
    const current = await this.getSubscription(tenantId);
    if (current && current.status === SubscriptionStatus.ACTIVE) {
      current.status = SubscriptionStatus.CANCELLED;
      current.cancelled_at = new Date();
      current.cancel_reason = 'Switched to new plan';
      await this.subscriptionRepo.save(current);
    }

    // Tinh thoi han dua tren billing cycle
    const now = new Date();
    const periodEnd = new Date(now);
    const isTrialing = plan.trial_days > 0;

    if (isTrialing) {
      periodEnd.setDate(periodEnd.getDate() + plan.trial_days);
    } else {
      switch (plan.billing_cycle) {
        case 'monthly':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
        case 'yearly':
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          break;
        case 'lifetime':
          periodEnd.setFullYear(periodEnd.getFullYear() + 100);
          break;
        case 'free':
          periodEnd.setFullYear(periodEnd.getFullYear() + 100);
          break;
      }
    }

    const subscription = this.subscriptionRepo.create({
      tenant_id: tenantId,
      plan_id: planId,
      status: isTrialing
        ? SubscriptionStatus.TRIALING
        : SubscriptionStatus.ACTIVE,
      current_period_start: now,
      current_period_end: periodEnd,
    });

    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Huy subscription. Verify subscription thuoc ve tenant cua caller de chong IDOR.
   * tenantId truyen null chi khi admin goi (bypass tenant check).
   */
  async cancel(
    subscriptionId: string,
    reason?: string,
    tenantId?: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    if (tenantId && subscription.tenant_id !== tenantId) {
      throw new BadRequestException(
        'Bạn không có quyền huỷ gói này (sai tenant)',
      );
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelled_at = new Date();
    subscription.cancel_reason = reason || null;
    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Gia han subscription — tinh period moi tu hien tai.
   */
  async renew(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    const plan = await this.findById(subscription.plan_id);
    const now = new Date();
    const periodEnd = new Date(now);

    switch (plan.billing_cycle) {
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'yearly':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      default:
        periodEnd.setFullYear(periodEnd.getFullYear() + 100);
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.current_period_start = now;
    subscription.current_period_end = periodEnd;
    subscription.cancelled_at = null;
    subscription.cancel_reason = null;
    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Lay subscription hien tai cua tenant (active hoac trialing).
   */
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Kiem tra usage cua tenant cho 1 metric, so sanh voi plan limit.
   */
  async checkUsage(
    tenantId: string,
    metric: string,
  ): Promise<{ used: number; limit: number; allowed: boolean }> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      return { used: 0, limit: 0, allowed: false };
    }

    const plan = await this.findById(subscription.plan_id);
    const features = plan.features;

    // Mapping metric -> plan limit
    const limitMap: Record<string, number> = {
      products: features.max_products,
      storage_bytes: features.max_storage_gb * 1024 * 1024 * 1024,
      users: features.max_users,
      api_calls: 100000, // Default API call limit
    };

    const limit = limitMap[metric] || 0;

    // Tinh tong usage trong period hien tai
    const usage = await this.usageRepo
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u.value), 0)', 'total')
      .where('u.tenant_id = :tenantId', { tenantId })
      .andWhere('u.metric = :metric', { metric })
      .andWhere('u.period_start >= :start', {
        start: subscription.current_period_start,
      })
      .andWhere('u.period_end <= :end', {
        end: subscription.current_period_end,
      })
      .getRawOne();

    const used = Number(usage?.total || 0);
    return { used, limit, allowed: used < limit };
  }

  /**
   * Atomic pre-check + reserve quota cho 1 resource.
   *
   * Cach hoat dong:
   * 1. Mo transaction.
   * 2. Lock subscription cua tenant (pessimistic_write) -> chan request khac doc/ghi
   *    cung subscription cho den khi tx nay xong.
   * 3. Tinh tong usage hien tai trong period (cung trong tx).
   * 4. So sanh `currentUsed + increment <= limit`. Neu vuot -> ForbiddenException.
   * 5. Insert ngay 1 row Usage (= reserve quota) trong cung tx -> commit.
   *
   * Cac service khac (orders, products, ...) GOI METHOD NAY TRUOC khi tao resource.
   * Neu khong throw thi quota da duoc giu cho, cu the tao tiep.
   *
   * Note: schema khong co cot `usage_count`/`quota` tren subscriptions, nen dung
   * pattern "lock subscription + count usage trong tx" de dat tinh atomic tuong duong.
   */
  async assertQuotaAvailable(
    tenantId: string,
    resourceType: string,
    increment = 1,
  ): Promise<void> {
    if (increment <= 0) return;

    await this.dataSource.transaction(async (manager) => {
      // 1. Lock subscription active/trialing cua tenant
      const subscription = await manager
        .createQueryBuilder(Subscription, 's')
        .setLock('pessimistic_write')
        .where('s.tenant_id = :tenantId', { tenantId })
        .andWhere('s.status IN (:...statuses)', {
          statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        })
        .orderBy('s.created_at', 'DESC')
        .getOne();

      if (!subscription) {
        throw new ForbiddenException(
          'Tenant chua co goi dich vu hop le, khong the tao resource',
        );
      }

      // 2. Lay limit tu plan
      const plan = await manager.findOne(Plan, {
        where: { id: subscription.plan_id },
      });
      if (!plan) {
        throw new ForbiddenException('Plan khong ton tai');
      }
      const features = plan.features;
      const limitMap: Record<string, number> = {
        products: features.max_products,
        storage_bytes: features.max_storage_gb * 1024 * 1024 * 1024,
        users: features.max_users,
        api_calls: 100000,
      };
      const limit = limitMap[resourceType] ?? 0;
      if (limit <= 0) {
        throw new ForbiddenException(
          `Goi dich vu khong cho phep tao "${resourceType}"`,
        );
      }

      // 3. Tinh tong usage trong period hien tai (trong cung tx, sau khi da lock subscription)
      const usageRow = await manager
        .createQueryBuilder(Usage, 'u')
        .select('COALESCE(SUM(u.value), 0)', 'total')
        .where('u.tenant_id = :tenantId', { tenantId })
        .andWhere('u.metric = :metric', { metric: resourceType })
        .andWhere('u.period_start >= :start', {
          start: subscription.current_period_start,
        })
        .andWhere('u.period_end <= :end', {
          end: subscription.current_period_end,
        })
        .getRawOne<{ total: string | number }>();

      const used = Number(usageRow?.total || 0);

      // 4. Check quota
      if (used + increment > limit) {
        throw new ForbiddenException(
          `Quota exceeded: ${resourceType} (used=${used}, limit=${limit}, requested=${increment})`,
        );
      }

      // 5. Reserve ngay bang cach insert 1 row Usage trong cung tx
      const reserved = manager.create(Usage, {
        tenant_id: tenantId,
        metric: resourceType,
        value: increment,
        period_start: subscription.current_period_start,
        period_end: subscription.current_period_end,
      });
      await manager.save(Usage, reserved);
    });
  }

  /**
   * Ghi nhan usage cua tenant.
   */
  async recordUsage(
    tenantId: string,
    metric: string,
    value: number,
  ): Promise<Usage> {
    const subscription = await this.getSubscription(tenantId);
    const now = new Date();

    const usage = this.usageRepo.create({
      tenant_id: tenantId,
      metric,
      value,
      period_start: subscription?.current_period_start || now,
      period_end: subscription?.current_period_end || now,
    });

    return this.usageRepo.save(usage);
  }

  /**
   * Kiem tra 1 feature co duoc phep theo plan cua tenant khong.
   */
  async isFeatureAllowed(
    tenantId: string,
    feature: keyof PlanFeatures,
  ): Promise<boolean> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription || subscription.status === SubscriptionStatus.CANCELLED) {
      return false;
    }

    const plan = await this.findById(subscription.plan_id);
    const features = plan.features;
    return !!features[feature];
  }
}
