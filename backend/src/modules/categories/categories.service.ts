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

    const created = await super.create(data);
    this.invalidateTreeCache();
    return created;
  }

  async update(id: string, data: DeepPartial<Category>): Promise<Category> {
    const updated = await super.update(id, data);
    this.invalidateTreeCache();
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await super.softDelete(id);
    this.invalidateTreeCache();
  }

  /**
   * Tra ve cay phan cap danh muc theo type.
   * Cache in-memory 5 phut — categories tree thay doi cham, doc nhieu lan.
   * Bound query 500 root + 2000 grandchildren de tranh OOM neu DB co 100k+ rows.
   */
  private treeCache = new Map<string, { data: Category[]; at: number }>();
  private readonly TREE_CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly TREE_MAX_ROOTS = 500;
  private readonly TREE_MAX_GRANDCHILDREN = 2000;

  async findTree(type?: string): Promise<Category[]> {
    const cacheKey = type || '__all__';
    const cached = this.treeCache.get(cacheKey);
    if (cached && Date.now() - cached.at < this.TREE_CACHE_TTL_MS) {
      return cached.data;
    }

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
      take: this.TREE_MAX_ROOTS,
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
        take: this.TREE_MAX_GRANDCHILDREN,
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

    this.treeCache.set(cacheKey, { data: roots, at: Date.now() });
    return roots;
  }

  /**
   * Invalidate tree cache — goi sau khi create/update/delete category.
   */
  private invalidateTreeCache(): void {
    this.treeCache.clear();
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
   * Batch UPDATE ... CASE WHEN ... — 1 query thay vi N queries.
   */
  async reorder(items: { id: string; sort_order: number }[]): Promise<void> {
    if (!items.length) return;

    const ids = items.map((i) => i.id);
    const cases = items
      .map((i) => `WHEN ? THEN ?`)
      .join(' ');
    const params: any[] = [];
    for (const i of items) {
      params.push(i.id, i.sort_order);
    }
    params.push(...ids);

    await this.categoryRepo.query(
      `UPDATE categories SET sort_order = CASE id ${cases} END WHERE id IN (${ids
        .map(() => '?')
        .join(',')})`,
      params,
    );

    this.invalidateTreeCache();
    this.logger.log(`Reordered ${items.length} categories`);
  }
}
