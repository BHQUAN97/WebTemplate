import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import slugify from 'slugify';
import { BaseService } from '../../common/services/base.service.js';
import { Tenant } from './entities/tenant.entity.js';

/**
 * Quan ly tenant — CRUD, tim theo slug/domain/owner, bat/tat, cap nhat settings.
 */
@Injectable()
export class TenantsService extends BaseService<Tenant> {
  protected searchableFields = ['name', 'slug', 'domain'];

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {
    super(tenantRepo, 'Tenant');
  }

  /**
   * Tao tenant moi — tu dong sinh slug tu name.
   */
  async create(data: DeepPartial<Tenant>): Promise<Tenant> {
    if (data.name && !data.slug) {
      data.slug = await this.generateUniqueSlug(data.name as string);
    }
    return super.create(data);
  }

  /**
   * Tim tenant theo slug.
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { slug } });
  }

  /**
   * Tim tenant theo custom domain.
   */
  async findByDomain(domain: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { domain } });
  }

  /**
   * Lay tat ca tenant cua 1 user (owner).
   */
  async findByOwner(userId: string): Promise<Tenant[]> {
    return this.tenantRepo.find({
      where: { owner_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Kich hoat tenant.
   */
  async activate(id: string): Promise<Tenant> {
    return this.update(id, { is_active: true } as DeepPartial<Tenant>);
  }

  /**
   * Vo hieu hoa tenant.
   */
  async deactivate(id: string): Promise<Tenant> {
    return this.update(id, { is_active: false } as DeepPartial<Tenant>);
  }

  /**
   * Cap nhat settings cua tenant (merge voi settings hien tai).
   */
  async updateSettings(
    id: string,
    settings: Record<string, any>,
  ): Promise<Tenant> {
    const tenant = await this.findById(id);
    const merged = { ...(tenant.settings || {}), ...settings };
    return this.update(id, { settings: merged } as DeepPartial<Tenant>);
  }

  /**
   * Sinh slug duy nhat tu name, them suffix neu trung.
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = slugify(name, { lower: true, strict: true });
    let existing = await this.tenantRepo.findOne({ where: { slug } });
    let suffix = 1;
    while (existing) {
      slug = `${slugify(name, { lower: true, strict: true })}-${suffix}`;
      existing = await this.tenantRepo.findOne({ where: { slug } });
      suffix++;
    }
    return slug;
  }
}
