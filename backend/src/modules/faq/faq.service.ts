import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Faq } from './entities/faq.entity.js';

/**
 * FAQ service — quan ly cau hoi thuong gap, binh chon, sap xep.
 */
@Injectable()
export class FaqService extends BaseService<Faq> {
  protected searchableFields = ['question', 'answer'];
  protected defaultSort = 'sort_order';

  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
  ) {
    super(faqRepository, 'Faq');
  }

  /**
   * Lay FAQ dang active, loc theo category neu co.
   */
  async findActive(categoryId?: string): Promise<Faq[]> {
    const qb = this.faqRepository
      .createQueryBuilder('entity')
      .where('entity.deleted_at IS NULL')
      .andWhere('entity.is_active = :active', { active: true });

    if (categoryId) {
      qb.andWhere('entity.category_id = :categoryId', { categoryId });
    }

    return qb.orderBy('entity.sort_order', 'ASC').getMany();
  }

  /**
   * Lay FAQ pho bien nhat (nhieu luot xem).
   */
  async findPopular(limit: number = 10): Promise<Faq[]> {
    return this.faqRepository.find({
      where: { is_active: true, deleted_at: null as any },
      order: { view_count: 'DESC' },
      take: limit,
    });
  }

  /**
   * Binh chon co ich / khong co ich.
   */
  async vote(id: string, helpful: boolean): Promise<Faq> {
    const faq = await this.findById(id);
    if (helpful) {
      await this.faqRepository.increment({ id }, 'helpful_count', 1);
    } else {
      await this.faqRepository.increment({ id }, 'not_helpful_count', 1);
    }
    return this.findById(id);
  }

  /**
   * Tang luot xem FAQ.
   */
  async incrementView(id: string): Promise<void> {
    await this.faqRepository.increment({ id }, 'view_count', 1);
  }

  /**
   * Sap xep lai thu tu FAQ.
   */
  async reorder(items: Array<{ id: string; sort_order: number }>): Promise<void> {
    const promises = items.map((item) =>
      this.faqRepository.update(item.id, { sort_order: item.sort_order }),
    );
    await Promise.all(promises);
    this.logger.log(`Reordered ${items.length} FAQ items`);
  }
}
