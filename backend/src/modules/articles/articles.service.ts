import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaginationMeta } from '../../common/utils/response.js';
import { ArticleStatus } from '../../common/constants/index.js';
import { Article } from './entities/article.entity.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { QueryArticlesDto } from './dto/query-articles.dto.js';
import { sanitizeCmsHtml } from '../../common/utils/sanitize-html.js';

/**
 * Articles service — quan ly bai viet, xuat ban, loc theo tag/category.
 */
@Injectable()
export class ArticlesService extends BaseService<Article> {
  protected searchableFields = ['title', 'excerpt', 'seo_keywords'];
  protected defaultSort = 'created_at';

  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
  ) {
    super(articlesRepository, 'Article');
  }

  /**
   * Tim bai viet theo slug — dung cho trang chi tiet.
   */
  async findBySlug(slug: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({
      where: { slug, deleted_at: null as any },
    });
    if (!article) {
      throw new NotFoundException(`Article with slug "${slug}" not found`);
    }
    return article;
  }

  /**
   * Xuat ban bai viet — set status PUBLISHED + published_at.
   */
  async publish(id: string): Promise<Article> {
    const article = await this.findById(id);
    article.status = ArticleStatus.PUBLISHED;
    article.published_at = new Date();
    return this.articlesRepository.save(article);
  }

  /**
   * Huy xuat ban — chuyen ve DRAFT, xoa published_at.
   */
  async unpublish(id: string): Promise<Article> {
    const article = await this.findById(id);
    article.status = ArticleStatus.DRAFT;
    article.published_at = null;
    return this.articlesRepository.save(article);
  }

  /**
   * Lay danh sach bai viet da xuat ban (public, phan trang).
   */
  async findPublished(
    options: PaginationDto,
  ): Promise<{ items: Article[]; meta: PaginationMeta }> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const qb = this.articlesRepository
      .createQueryBuilder('entity')
      .where('entity.deleted_at IS NULL')
      .andWhere('entity.status = :status', { status: ArticleStatus.PUBLISHED })
      .orderBy('entity.published_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (search && this.searchableFields.length > 0) {
      const conditions = this.searchableFields
        .map((f) => `entity.${f} LIKE :search`)
        .join(' OR ');
      qb.andWhere(`(${conditions})`, { search: `%${search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return { items, meta };
  }

  /**
   * Tim bai viet theo tag.
   */
  async findByTag(
    tag: string,
    options: PaginationDto,
  ): Promise<{ items: Article[]; meta: PaginationMeta }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const qb = this.articlesRepository
      .createQueryBuilder('entity')
      .where('entity.deleted_at IS NULL')
      .andWhere('entity.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('JSON_CONTAINS(entity.tags, :tag)', {
        tag: JSON.stringify(tag),
      })
      .orderBy('entity.published_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return { items, meta };
  }

  /**
   * Lay bai viet lien quan — cung category hoac cung tags.
   */
  async findRelated(articleId: string, limit = 5): Promise<Article[]> {
    const article = await this.findById(articleId);

    const qb = this.articlesRepository
      .createQueryBuilder('entity')
      .where('entity.deleted_at IS NULL')
      .andWhere('entity.status = :status', { status: ArticleStatus.PUBLISHED })
      .andWhere('entity.id != :id', { id: articleId });

    // Uu tien cung category — binding parameter de tranh SQLi
    if (article.category_id) {
      qb.addOrderBy(
        'CASE WHEN entity.category_id = :sameCatId THEN 0 ELSE 1 END',
        'ASC',
      );
      qb.setParameter('sameCatId', article.category_id);
    }

    qb.addOrderBy('entity.published_at', 'DESC').take(limit);

    return qb.getMany();
  }

  /**
   * Tang luot xem bai viet.
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.articlesRepository.increment({ id }, 'view_count', 1);
  }

  /**
   * Tao bai viet — tu dong sinh slug tu title + sanitize HTML content.
   */
  async createArticle(
    dto: CreateArticleDto,
    authorId: string,
  ): Promise<Article> {
    const slug = this.generateSlug(dto.title);
    const content = sanitizeCmsHtml(dto.content);
    return this.create({
      ...dto,
      slug,
      content,
      author_id: authorId,
    } as any);
  }

  /**
   * Override update — sanitize HTML content neu co.
   */
  async update(id: string, data: DeepPartial<Article>): Promise<Article> {
    if (typeof data.content === 'string') {
      data = { ...data, content: sanitizeCmsHtml(data.content) };
    }
    return super.update(id, data);
  }

  /**
   * Override applyFilters — loc theo status, category, author, tag, featured.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Article>,
    options: PaginationDto,
  ): void {
    const query = options as QueryArticlesDto;

    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }

    if (query.category_id) {
      qb.andWhere('entity.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query.author_id) {
      qb.andWhere('entity.author_id = :authorId', {
        authorId: query.author_id,
      });
    }

    if (query.tag) {
      qb.andWhere('JSON_CONTAINS(entity.tags, :tag)', {
        tag: JSON.stringify(query.tag),
      });
    }

    if (query.is_featured !== undefined) {
      qb.andWhere('entity.is_featured = :isFeatured', {
        isFeatured: query.is_featured,
      });
    }
  }

  /**
   * Tao slug tu tieu de bai viet.
   */
  private generateSlug(title: string): string {
    return title
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
