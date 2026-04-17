import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Review } from './entities/review.entity.js';
import { QueryReviewsDto } from './dto/query-reviews.dto.js';

/**
 * Reviews service — quan ly danh gia san pham, phe duyet, tra loi admin.
 */
@Injectable()
export class ReviewsService extends BaseService<Review> {
  protected searchableFields = ['title', 'content'];

  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
  ) {
    super(reviewsRepository, 'Review');
  }

  /**
   * Lay danh gia cua san pham (chi hien approved cho public).
   */
  async getProductReviews(
    productId: string,
    options: PaginationDto,
  ) {
    const qb = this.reviewsRepository
      .createQueryBuilder('entity')
      .where('entity.deleted_at IS NULL')
      .andWhere('entity.product_id = :productId', { productId })
      .andWhere('entity.is_approved = :approved', { approved: true })
      .orderBy('entity.created_at', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  /**
   * Tinh rating trung binh cua san pham.
   */
  async getAverageRating(productId: string): Promise<number> {
    const result = await this.reviewsRepository
      .createQueryBuilder('entity')
      .select('AVG(entity.rating)', 'avg')
      .where('entity.product_id = :productId', { productId })
      .andWhere('entity.is_approved = :approved', { approved: true })
      .andWhere('entity.deleted_at IS NULL')
      .getRawOne();
    return result?.avg ? parseFloat(result.avg) : 0;
  }

  /**
   * Thong ke rating theo tung muc 1-5 va trung binh.
   */
  async getProductRatingStats(
    productId: string,
  ): Promise<{ 1: number; 2: number; 3: number; 4: number; 5: number; average: number }> {
    const rows = await this.reviewsRepository
      .createQueryBuilder('entity')
      .select('entity.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('entity.product_id = :productId', { productId })
      .andWhere('entity.is_approved = :approved', { approved: true })
      .andWhere('entity.deleted_at IS NULL')
      .groupBy('entity.rating')
      .getRawMany();

    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, average: 0 };
    let totalCount = 0;
    let totalSum = 0;

    for (const row of rows) {
      const r = parseInt(row.rating);
      const c = parseInt(row.count);
      stats[r as keyof typeof stats] = c;
      totalCount += c;
      totalSum += r * c;
    }

    stats.average = totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(2)) : 0;
    return stats;
  }

  /**
   * Phe duyet danh gia.
   */
  async approve(id: string): Promise<Review> {
    return this.update(id, { is_approved: true } as any);
  }

  /**
   * Tu choi danh gia.
   */
  async reject(id: string): Promise<Review> {
    return this.update(id, { is_approved: false } as any);
  }

  /**
   * Admin tra loi danh gia.
   */
  async reply(id: string, content: string): Promise<Review> {
    return this.update(id, {
      admin_reply: content,
      replied_at: new Date(),
    } as any);
  }

  /**
   * Lay tat ca danh gia cua 1 user.
   */
  async getUserReviews(userId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { user_id: userId, deleted_at: null as any },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Override applyFilters — loc theo product, rating, trang thai phe duyet.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Review>,
    options: PaginationDto,
  ): void {
    const query = options as QueryReviewsDto;

    if (query.product_id) {
      qb.andWhere('entity.product_id = :productId', {
        productId: query.product_id,
      });
    }

    if (query.rating !== undefined) {
      qb.andWhere('entity.rating = :rating', { rating: query.rating });
    }

    if (query.is_approved !== undefined) {
      qb.andWhere('entity.is_approved = :isApproved', {
        isApproved: query.is_approved,
      });
    }
  }
}
