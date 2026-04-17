import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Page } from './entities/page.entity.js';
import { CreatePageDto } from './dto/create-page.dto.js';

/**
 * Pages service — quan ly trang tinh, page builder, homepage, cay phan cap.
 */
@Injectable()
export class PagesService extends BaseService<Page> {
  protected searchableFields = ['title', 'seo_title'];
  protected defaultSort = 'sort_order';

  constructor(
    @InjectRepository(Page)
    private readonly pagesRepository: Repository<Page>,
  ) {
    super(pagesRepository, 'Page');
  }

  /**
   * Tim trang theo slug — dung cho frontend render.
   */
  async findBySlug(slug: string): Promise<Page> {
    const page = await this.pagesRepository.findOne({
      where: { slug, deleted_at: null as any },
      relations: ['children'],
    });
    if (!page) {
      throw new NotFoundException(`Page with slug "${slug}" not found`);
    }
    return page;
  }

  /**
   * Lay tat ca trang da xuat ban.
   */
  async findPublished(): Promise<Page[]> {
    return this.pagesRepository.find({
      where: { status: 'published', deleted_at: null as any },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Lay trang chu hien tai.
   */
  async getHomepage(): Promise<Page | null> {
    return this.pagesRepository.findOne({
      where: { is_homepage: true, deleted_at: null as any },
    });
  }

  /**
   * Dat 1 trang lam trang chu — bo flag cac trang khac.
   */
  async setHomepage(id: string): Promise<Page> {
    // Bo is_homepage cua tat ca trang khac
    await this.pagesRepository
      .createQueryBuilder()
      .update(Page)
      .set({ is_homepage: false })
      .where('is_homepage = :val', { val: true })
      .execute();

    const page = await this.findById(id);
    page.is_homepage = true;
    page.status = 'published';
    return this.pagesRepository.save(page);
  }

  /**
   * Lay cay trang (tree) — chi trang cap cao nhat, children nested.
   */
  async getPageTree(): Promise<Page[]> {
    return this.pagesRepository.find({
      where: { parent_id: null as any, deleted_at: null as any },
      relations: ['children'],
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Override create — tu dong sinh slug tu title.
   */
  async createPage(dto: CreatePageDto): Promise<Page> {
    const slug = this.generateSlug(dto.title);
    return this.create({ ...dto, slug } as any);
  }

  /**
   * Tao slug tu tieu de trang.
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
