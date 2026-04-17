import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DeepPartial } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { sanitizeCmsHtml } from '../../common/utils/sanitize-html.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Product } from './entities/product.entity.js';
import { ProductVariant } from './entities/product-variant.entity.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';

/**
 * Sanitize CMS-like fields de chong stored XSS. Goi truoc khi create/update.
 */
function sanitizeProductHtmlFields<T extends Record<string, any>>(data: T): T {
  const d = data as any;
  if (d.description !== undefined && d.description !== null) {
    d.description = sanitizeCmsHtml(d.description);
  }
  if (d.short_description !== undefined && d.short_description !== null) {
    d.short_description = sanitizeCmsHtml(d.short_description);
  }
  return data;
}

/**
 * Products service — quan ly san pham, variant, loc theo gia/category/tags.
 */
@Injectable()
export class ProductsService extends BaseService<Product> {
  protected searchableFields = ['name', 'sku', 'brand'];
  protected defaultSort = 'sort_order';

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
  ) {
    super(productsRepository, 'Product');
  }

  /**
   * Tim san pham theo slug — dung cho trang chi tiet san pham.
   */
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug, deleted_at: null as any },
      relations: ['variants'],
    });
    if (!product) {
      throw new (await import('@nestjs/common')).NotFoundException(
        `Product with slug "${slug}" not found`,
      );
    }
    return product;
  }

  /**
   * Lay san pham theo category.
   * Default take(100) de tranh DoS khi category co hang nghin san pham.
   */
  async findByCategory(
    categoryId: string,
    limit: number = 100,
  ): Promise<Product[]> {
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    return this.productsRepository.find({
      where: { category_id: categoryId, is_active: true, deleted_at: null as any },
      relations: ['variants'],
      order: { sort_order: 'ASC' },
      take: safeLimit,
    });
  }

  /**
   * Lay danh sach san pham noi bat.
   */
  async findFeatured(limit = 10): Promise<Product[]> {
    return this.productsRepository.find({
      where: { is_featured: true, is_active: true, deleted_at: null as any },
      order: { sort_order: 'ASC' },
      take: limit,
    });
  }

  /**
   * Tang luot xem san pham.
   */
  async updateViewCount(id: string): Promise<void> {
    await this.productsRepository.increment({ id }, 'view_count', 1);
  }

  /**
   * Override update — sanitize description/short_description neu co thay doi.
   */
  async update(id: string, data: DeepPartial<Product>): Promise<Product> {
    return super.update(id, sanitizeProductHtmlFields({ ...data }));
  }

  /**
   * Tao san pham kem variants (neu co). Sanitize description/short_description
   * de chong stored XSS (rich HTML rendered via dangerouslySetInnerHTML o FE).
   */
  async createWithVariants(dto: CreateProductDto): Promise<Product> {
    const slug = this.generateSlug(dto.name);
    const { variants, ...productData } = dto;
    const sanitized = sanitizeProductHtmlFields({ ...productData });

    const product = await this.create({
      ...sanitized,
      slug,
    } as any);

    if (variants && variants.length > 0) {
      const variantEntities = variants.map((v) =>
        this.variantsRepository.create({
          ...v,
          product_id: product.id,
        }),
      );
      product.variants = await this.variantsRepository.save(variantEntities);
    }

    return product;
  }

  /**
   * Lay san pham kem variants.
   */
  async findByIdWithVariants(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deleted_at: null as any },
      relations: ['variants'],
    });
    if (!product) {
      throw new (await import('@nestjs/common')).NotFoundException(
        `Product with ID "${id}" not found`,
      );
    }
    return product;
  }

  /**
   * Override applyFilters — loc theo gia, category, tags, featured.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Product>,
    options: PaginationDto,
  ): void {
    const query = options as QueryProductsDto;

    if (query.category_id) {
      qb.andWhere('entity.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query.min_price !== undefined) {
      qb.andWhere('entity.price >= :minPrice', { minPrice: query.min_price });
    }

    if (query.max_price !== undefined) {
      qb.andWhere('entity.price <= :maxPrice', { maxPrice: query.max_price });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('entity.is_active = :isActive', { isActive: query.is_active });
    }

    if (query.is_featured !== undefined) {
      qb.andWhere('entity.is_featured = :isFeatured', {
        isFeatured: query.is_featured,
      });
    }

    if (query.tags) {
      // Tim san pham co chua tag (JSON array search)
      qb.andWhere('JSON_CONTAINS(entity.tags, :tag)', {
        tag: JSON.stringify(query.tags),
      });
    }
  }

  /**
   * Tao slug tu ten san pham.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .concat('-', Date.now().toString(36));
  }
}
