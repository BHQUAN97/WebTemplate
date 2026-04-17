import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Promotion } from './entities/promotion.entity.js';
import { PromotionUsage } from './entities/promotion-usage.entity.js';
import { QueryPromotionsDto } from './dto/query-promotions.dto.js';

/**
 * Promotions service — quan ly ma giam gia, validate, ap dung, thong ke.
 */
@Injectable()
export class PromotionsService extends BaseService<Promotion> {
  protected searchableFields = ['code', 'name'];

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepository: Repository<Promotion>,
    @InjectRepository(PromotionUsage)
    private readonly usageRepository: Repository<PromotionUsage>,
  ) {
    super(promotionsRepository, 'Promotion');
  }

  /**
   * Validate ma giam gia — kiem tra active, thoi gian, gioi han su dung, don toi thieu.
   */
  async validate(
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<{ valid: boolean; promotion?: Promotion; message?: string }> {
    const promotion = await this.promotionsRepository.findOne({
      where: { code, deleted_at: null as any },
    });

    if (!promotion) {
      return { valid: false, message: 'Promotion code not found' };
    }

    if (!promotion.is_active) {
      return { valid: false, message: 'Promotion is inactive' };
    }

    const now = new Date();
    if (now < promotion.start_date || now > promotion.end_date) {
      return { valid: false, message: 'Promotion has expired or not started' };
    }

    // Kiem tra gioi han tong so lan su dung
    if (promotion.usage_limit && promotion.used_count >= promotion.usage_limit) {
      return { valid: false, message: 'Promotion usage limit reached' };
    }

    // Kiem tra gioi han su dung cua user
    const userUsageCount = await this.usageRepository.count({
      where: { promotion_id: promotion.id, user_id: userId },
    });
    if (userUsageCount >= promotion.per_user_limit) {
      return { valid: false, message: 'You have reached the usage limit for this promotion' };
    }

    // Kiem tra don hang toi thieu
    if (promotion.min_order_amount && orderAmount < Number(promotion.min_order_amount)) {
      return {
        valid: false,
        message: `Minimum order amount is ${promotion.min_order_amount}`,
      };
    }

    return { valid: true, promotion };
  }

  /**
   * Ap dung ma giam gia cho don hang — ghi nhan usage, tang used_count.
   */
  async apply(
    code: string,
    orderId: string,
    userId: string,
    orderAmount: number,
  ): Promise<{ discount_amount: number }> {
    const { valid, promotion, message } = await this.validate(code, userId, orderAmount);
    if (!valid || !promotion) {
      throw new BadRequestException(message);
    }

    // Tinh so tien giam
    let discountAmount: number;
    if (promotion.type === 'percentage') {
      discountAmount = (orderAmount * Number(promotion.value)) / 100;
    } else if (promotion.type === 'fixed') {
      discountAmount = Number(promotion.value);
    } else if (promotion.type === 'free_shipping') {
      discountAmount = 0; // Xu ly rieng o tang shipping
    } else {
      discountAmount = 0;
    }

    // Gioi han muc giam toi da
    if (promotion.max_discount_amount && discountAmount > Number(promotion.max_discount_amount)) {
      discountAmount = Number(promotion.max_discount_amount);
    }

    // Ghi nhan su dung
    const usage = this.usageRepository.create({
      promotion_id: promotion.id,
      user_id: userId,
      order_id: orderId,
      discount_amount: discountAmount,
    });
    await this.usageRepository.save(usage);

    // Tang so lan da dung
    await this.promotionsRepository.increment({ id: promotion.id }, 'used_count', 1);

    return { discount_amount: discountAmount };
  }

  /**
   * Lay cac khuyen mai dang hoat dong.
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return this.promotionsRepository.find({
      where: {
        is_active: true,
        start_date: LessThanOrEqual(now),
        end_date: MoreThanOrEqual(now),
        deleted_at: null as any,
      },
      order: { end_date: 'ASC' },
    });
  }

  /**
   * Thong ke su dung khuyen mai.
   */
  async getUsageStats(promotionId: string) {
    const totalUsage = await this.usageRepository.count({
      where: { promotion_id: promotionId },
    });

    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.discount_amount)', 'total_discount')
      .where('usage.promotion_id = :promotionId', { promotionId })
      .getRawOne();

    return {
      total_usage: totalUsage,
      total_discount: result?.total_discount ? parseFloat(result.total_discount) : 0,
    };
  }

  /**
   * Override applyFilters — loc theo active, type.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Promotion>,
    options: PaginationDto,
  ): void {
    const query = options as QueryPromotionsDto;

    if (query.is_active !== undefined) {
      qb.andWhere('entity.is_active = :isActive', { isActive: query.is_active });
    }

    if (query.type) {
      qb.andWhere('entity.type = :type', { type: query.type });
    }
  }
}
