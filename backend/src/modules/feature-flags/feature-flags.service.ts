import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { BaseService } from '../../common/services/base.service.js';
import { FeatureFlag } from './entities/feature-flag.entity.js';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto.js';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';

/**
 * Service quan ly feature flags.
 * Cache in-memory TTL 30s de tranh query DB moi lan check flag.
 */
@Injectable()
export class FeatureFlagsService extends BaseService<FeatureFlag> implements OnModuleInit {
  protected searchableFields = ['key', 'description'];

  /** Cache: key -> { flag, expiresAt } */
  private readonly cache = new Map<string, { flag: FeatureFlag | null; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 30_000;

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepo: Repository<FeatureFlag>,
  ) {
    super(flagRepo, 'FeatureFlag');
  }

  /**
   * Seed cac flag mac dinh khi module khoi tao.
   */
  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  /**
   * Kiem tra 1 flag co bat cho user khong.
   * Logic:
   *  1. Neu flag khong ton tai hoac enabled=false -> false
   *  2. Neu co target_roles va user.role khong nam trong do -> false
   *  3. Neu rollout_percentage < 100, hash userId % 100 de quyet dinh
   *  4. Khong co user ma rollout<100 -> false (tranh leak random features)
   */
  async isEnabled(key: string, user?: Pick<ICurrentUser, 'id' | 'role'>): Promise<boolean> {
    const flag = await this.getFlagCached(key);
    if (!flag || !flag.enabled) return false;

    // Role gating
    if (flag.target_roles && flag.target_roles.length > 0) {
      if (!user?.role || !flag.target_roles.includes(user.role)) {
        return false;
      }
    }

    // Rollout full
    const rollout = flag.rollout_percentage ?? 100;
    if (rollout >= 100) return true;
    if (rollout <= 0) return false;

    // Can userId de hash rollout deterministic
    if (!user?.id) return false;
    return this.hashPercent(`${flag.key}:${user.id}`) < rollout;
  }

  /**
   * Tao flag moi — throw ConflictException neu key trung.
   */
  async createFlag(dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    const exists = await this.flagRepo.findOne({ where: { key: dto.key } });
    if (exists) {
      throw new BadRequestException(`Feature flag voi key "${dto.key}" da ton tai`);
    }
    const saved = await this.create(dto as any);
    this.invalidate(dto.key);
    return saved;
  }

  /**
   * Cap nhat flag. Neu doi key, invalidate cache ca key cu va moi.
   */
  async updateFlag(id: string, dto: UpdateFeatureFlagDto): Promise<FeatureFlag> {
    const existing = await this.findById(id);
    const updated = await this.update(id, dto as any);
    this.invalidate(existing.key);
    if (dto.key && dto.key !== existing.key) this.invalidate(dto.key);
    return updated;
  }

  async deleteFlag(id: string): Promise<void> {
    const flag = await this.findById(id);
    await this.softDelete(id);
    this.invalidate(flag.key);
  }

  /**
   * Lay 1 flag theo key (khong throw neu khong co — tra null).
   */
  async findByKey(key: string): Promise<FeatureFlag | null> {
    return this.flagRepo.findOne({ where: { key } });
  }

  /**
   * Lay flag qua cache, re-fetch khi het TTL.
   */
  private async getFlagCached(key: string): Promise<FeatureFlag | null> {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.flag;
    }
    const flag = await this.findByKey(key);
    this.cache.set(key, { flag, expiresAt: now + this.CACHE_TTL_MS });
    return flag;
  }

  /**
   * Xoa 1 entry khoi cache — goi khi update/delete flag.
   */
  private invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Hash 1 string → 0-99 deterministic, dung SHA-256.
   * Dung cho rollout percentage: neu hashPercent(input) < rollout thi user duoc vao.
   */
  private hashPercent(input: string): number {
    const hash = createHash('sha256').update(input).digest();
    // Doc 4 bytes dau, convert to uint32, modulo 100
    const n = hash.readUInt32BE(0);
    return n % 100;
  }

  /**
   * Seed 3 flag mau neu chua co.
   */
  private async seedDefaults(): Promise<void> {
    const defaults: CreateFeatureFlagDto[] = [
      {
        key: 'new_checkout',
        enabled: false,
        description: 'New checkout flow voi one-page UX',
        rollout_percentage: 100,
      },
      {
        key: 'beta_admin_ui',
        enabled: false,
        description: 'Beta admin dashboard voi UI moi',
        rollout_percentage: 100,
        target_roles: ['admin'],
      },
      {
        key: 'social_login',
        enabled: false,
        description: 'Dang nhap qua Google/Facebook OAuth',
        rollout_percentage: 100,
      },
    ];

    for (const item of defaults) {
      try {
        const exists = await this.flagRepo.findOne({ where: { key: item.key } });
        if (!exists) {
          await this.create(item as any);
          this.logger.log(`Seeded feature flag: ${item.key}`);
        }
      } catch (err) {
        // Bo qua loi seed (vi du table chua migrate) — khong block boot
        this.logger.warn(`Seed feature flag "${item.key}" skipped: ${(err as Error).message}`);
        break;
      }
    }
  }
}
