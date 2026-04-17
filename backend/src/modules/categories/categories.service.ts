import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, IsNull, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Category } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { QueryCategoriesDto } from './dto/query-categories.dto.js';
import { generateUniqueSlug } from '../../common/utils/slug.js';

/**
 * Quan ly danh muc da cap, da loai.
 * Ho tro cay phan cap, auto-generate slug, sap xep thu tu.
 */
@Injectable()
export class CategoriesService extends BaseService<Category> {
  protected searchableFields = ['name', 'description'];
  protected defaultSort = 'sort_order';

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {
    super(categoryRepo, 'Category');
  }

  /**
   * Hook them filter theo type, parent_id, is_active.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Category>,
    options: PaginationDto,
  ): void {
    const opts = options as QueryCategoriesDto;
    if (opts.type) {
      qb.andWhere('entity.type = :type', { type: opts.type });
    }
    if (opts.parent_id) {
      qb.andWhere('entity.parent_id = :parent_id', {
        parent_id: opts.parent_id,
      });
    }
    if (opts.is_active !== undefined) {
      qb.andWhere('entity.is_active = :is_active', {
        is_active: opts.is_active,
      });
    }
  }

  /**
   * Override create de tu dong tao slug tu name.
   */
  async create(data: DeepPartial<Category>): Promise<Category> {
    const dto = data as CreateCategoryDto & DeepPartial<Category>;

    // Auto-generate slug tu name
    if (dto.name && !(data as any).slug) {
      const slug = await generateUniqueSlug(dto.name, async (s) => {
        const existing = await this.categoryRepo.findOne({
          where: { slug: s },
        });
        return !!existing;
      });
      (data as any).slug = slug;
    }

    return super.create(data);
  }

  /**
   * Tra ve cay phan cap danh muc theo type.
   * Chi lay cac root categories (parent_id = null), kem children.
   */
  async findTree(type?: string): Promise<Category[]> {
    const where: any = {
      parent_id: IsNull(),
      deleted_at: IsNull(),
    };
    if (type) {
      where.type = type;
    }

    const roots = await this.categoryRepo.find({
      where,
      relations: ['children'],
      order: { sort_order: 'ASC' },
    });

    // Gom tat ca child IDs de load grandchildren trong 1 query (tranh N+1).
    const childIds: string[] = [];
    for (const root of roots) {
      if (root.children?.length) {
        root.children = root.children.filter((c) => !c.deleted_at);
        root.children.sort((a, b) => a.sort_order - b.sort_order);
        for (const c of root.children) childIds.push(c.id);
      }
    }

    if (childIds.length > 0) {
      const { In } = await import('typeorm');
      const grandchildren = await this.categoryRepo.find({
        where: { parent_id: In(childIds), deleted_at: IsNull() },
        order: { sort_order: 'ASC' },
      });

      // Index grandchildren theo parent_id de gan nhanh
      const byParent = new Map<string, typeof grandchildren>();
      for (const gc of grandchildren) {
        const list = byParent.get(gc.parent_id as string) || [];
        list.push(gc);
        byParent.set(gc.parent_id as string, list);
      }

      for (const root of roots) {
        for (const child of root.children || []) {
          child.children = byParent.get(child.id) || [];
        }
      }
    }

    return roots;
  }

  /**
   * Tim category theo slug.
   */
  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryRepo.findOne({
      where: { slug, deleted_at: IsNull() },
      relations: ['children'],
    });
  }

  /**
   * Lay tat ca categories theo type (khong phan trang).
   */
  async findByType(type: string): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { type, deleted_at: IsNull() },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Cap nhat thu tu sap xep cho nhieu categories.
   */
  async reorder(
    items: { id: string; sort_order: number }[],
  ): Promise<void> {
    for (const item of items) {
      await this.categoryRepo.update(item.id, {
        sort_order: item.sort_order,
      });
    }
    this.logger.log(`Reordered ${items.length} categories`);
  }
}
