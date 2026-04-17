import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DeepPartial, DataSource, QueryFailedError } from 'typeorm';
import slugify from 'slugify';
import { randomBytes } from 'crypto';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(tenantRepo, 'Tenant');
  }

  /**
   * Tao tenant moi — tu dong sinh slug tu name, retry khi gap unique constraint
   * de chong race condition khi 2 admin cung tao tenant ten giong nhau.
   */
  async create(data: DeepPartial<Tenant>): Promise<Tenant> {
    const baseSlug = data.slug
      ? String(data.slug)
      : data.name
        ? slugify(String(data.name), { lower: true, strict: true })
        : '';

    // Khong co name lan slug -> de super.create xu ly (se fail validation)
    if (!baseSlug) {
      return super.create(data);
    }

    // Lan dau thu slug "sach", neu da ton tai thi sinh suffix tang dan
    // Toi da retry 5 lan: base, base-1, base-2, base-<rand>, base-<rand>, base-<rand>
    const maxAttempts = 6;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateSlug = await this.buildCandidateSlug(baseSlug, attempt);
      try {
        const entity = this.tenantRepo.create({
          ...data,
          slug: candidateSlug,
        } as DeepPartial<Tenant>);
        const saved = await this.tenantRepo.save(entity);
        this.logger.log(`Created Tenant: ${(saved as any).id}`);
        return saved;
      } catch (err) {
        lastError = err;
        if (!this.isDuplicateSlugError(err)) {
          throw err;
        }
        // Duplicate slug -> thu lai voi suffix khac
        this.logger.warn(
          `Slug conflict for "${candidateSlug}", retrying (attempt ${attempt + 1}/${maxAttempts})`,
        );
      }
    }

    throw new ConflictException(
      `Khong the sinh slug duy nhat cho tenant sau ${maxAttempts} lan thu`,
    );
  }

  /**
   * Sinh candidate slug theo so lan thu:
   * - attempt 0: base goc
   * - attempt 1-2: base-1, base-2 (kiem tra DB voi SELECT FOR UPDATE de giam race window)
   * - attempt 3+: base-<random4> de tranh hot conflict
   */
  private async buildCandidateSlug(
    baseSlug: string,
    attempt: number,
  ): Promise<string> {
    if (attempt === 0) {
      return baseSlug;
    }
    if (attempt <= 2) {
      // Dung transaction voi pessimistic lock de check + reserve trong cung 1 query
      return this.dataSource.transaction(async (manager) => {
        let suffix = attempt;
        let candidate = `${baseSlug}-${suffix}`;
        // Loop tang suffix neu da co
        // (gioi han trong transaction de tranh long-running lock)
        for (let i = 0; i < 50; i++) {
          const existing = await manager
            .createQueryBuilder(Tenant, 't')
            .setLock('pessimistic_write')
            .where('t.slug = :slug', { slug: candidate })
            .getOne();
          if (!existing) return candidate;
          suffix++;
          candidate = `${baseSlug}-${suffix}`;
        }
        // Fallback random
        return `${baseSlug}-${randomBytes(2).toString('hex')}`;
      });
    }
    // Random 4 ky tu hex de tranh tiep tuc collision
    return `${baseSlug}-${randomBytes(2).toString('hex')}`;
  }

  /**
   * Kiem tra error co phai duplicate key (MySQL: ER_DUP_ENTRY / errno 1062) khong.
   */
  private isDuplicateSlugError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const driverErr = (err as any).driverError ?? err;
    const code = driverErr?.code;
    const errno = driverErr?.errno;
    return code === 'ER_DUP_ENTRY' || errno === 1062;
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
}
