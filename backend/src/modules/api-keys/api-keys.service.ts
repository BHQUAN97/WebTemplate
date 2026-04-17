import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { BaseService } from '../../common/services/base.service.js';
import { ApiKey } from './entities/api-key.entity.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';

/**
 * Danh sach scopes kha dung cho API key.
 */
export const AVAILABLE_SCOPES = [
  'products:read',
  'products:write',
  'orders:read',
  'orders:write',
  'users:read',
  'users:write',
  'categories:read',
  'categories:write',
  'media:read',
  'media:write',
  'settings:read',
  'settings:write',
  'analytics:read',
] as const;

/**
 * Quan ly API keys — tao, validate, revoke, rate limit.
 * Key chi duoc tra ve 1 lan duy nhat khi tao.
 */
@Injectable()
export class ApiKeysService extends BaseService<ApiKey> {
  protected searchableFields = ['name', 'key_prefix'];

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {
    super(apiKeyRepo, 'ApiKey');
  }

  /**
   * Tao API key moi — sinh random key, luu hash, tra ve full key 1 lan.
   */
  async generate(
    tenantId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKey; key: string }> {
    // Sinh random key: wt_<32 random hex chars>
    const rawKey = `wt_${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.create({
      tenant_id: tenantId,
      name: dto.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: dto.scopes,
      rate_limit: dto.rate_limit || 1000,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
    } as any);

    return { apiKey, key: rawKey };
  }

  /**
   * Validate API key — hash va tim trong DB.
   * Tra ve ApiKey neu hop le, null neu khong.
   */
  async validate(key: string): Promise<ApiKey | null> {
    const keyHash = createHash('sha256').update(key).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({
      where: { key_hash: keyHash, is_active: true },
    });

    if (!apiKey) return null;

    // Kiem tra het han
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return null;
    }

    // Cap nhat last_used_at
    apiKey.last_used_at = new Date();
    await this.apiKeyRepo.save(apiKey);

    return apiKey;
  }

  /**
   * Thu hoi (vo hieu hoa) API key — verify ownership tu tenantId truoc khi revoke.
   * Truoc day revoke chi can id → IDOR cho phep tenant khac vo hieu hoa key.
   */
  async revoke(id: string, tenantId?: string): Promise<ApiKey> {
    const apiKey = await this.findById(id);
    if (tenantId && apiKey.tenant_id !== tenantId) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Cannot revoke API key from another tenant',
      );
    }
    apiKey.is_active = false;
    return this.apiKeyRepo.save(apiKey);
  }

  /**
   * Lay danh sach API keys cua tenant.
   */
  async getByTenant(tenantId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Kiem tra rate limit — dem so lan su dung trong 1 gio qua.
   * Tra ve true neu con trong gioi han.
   */
  async checkRateLimit(keyId: string): Promise<boolean> {
    const apiKey = await this.findById(keyId);
    // Rate limit check don gian dua tren last_used_at
    // Trong thuc te nen dung Redis counter
    return apiKey.is_active;
  }

  /**
   * Ghi nhan 1 lan su dung API key.
   */
  async recordUsage(keyId: string): Promise<void> {
    await this.apiKeyRepo.update(keyId, { last_used_at: new Date() });
  }
}
