import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, FindOptionsWhere } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { CreateAuditLogDto } from './dto/create-audit-log.dto.js';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto.js';
import type { PaginationMeta } from '../../common/utils/response.js';

/**
 * Service quan ly audit logs.
 * Extends BaseService de tan dung CRUD + pagination nhung override findAll
 * vi query can filter date-range + user_id/action/resource riêng.
 */
@Injectable()
export class AuditLogsService extends BaseService<AuditLog> {
  protected searchableFields = ['action', 'resource_type', 'resource_id'];

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {
    super(auditRepo, 'AuditLog');
  }

  /**
   * Ghi 1 audit log. Duoc goi boi AuditInterceptor hoac service khac.
   * Khong throw neu loi — audit log failure khong duoc lam hong request chinh.
   */
  async log(data: CreateAuditLogDto): Promise<AuditLog | null> {
    try {
      const changes = this.serializeChanges(data.changes);
      const entity = this.auditRepo.create({
        user_id: data.user_id ?? null,
        action: data.action,
        resource_type: data.resource_type ?? null,
        resource_id: data.resource_id ?? null,
        changes,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
      } as any);
      const saved = await this.auditRepo.save(entity as any);
      return saved as unknown as AuditLog;
    } catch (err) {
      // Khong throw — chi log de khong anh huong request chinh
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Tim kiem audit logs voi filter + pagination.
   * Ho tro loc theo user_id, action, resource_type/id va khoang thoi gian.
   */
  async findAllFiltered(
    query: QueryAuditLogsDto,
  ): Promise<{ items: AuditLog[]; meta: PaginationMeta }> {
    const { page = 1, limit = 20, user_id, action, resource_type, resource_id, from_date, to_date } =
      query;

    const where: FindOptionsWhere<AuditLog> = {};
    if (user_id) where.user_id = user_id;
    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;
    if (resource_id) where.resource_id = resource_id;

    if (from_date && to_date) {
      where.created_at = Between(new Date(from_date), new Date(to_date));
    } else if (from_date) {
      where.created_at = MoreThanOrEqual(new Date(from_date));
    } else if (to_date) {
      where.created_at = LessThanOrEqual(new Date(to_date));
    }

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Serialize changes thanh string JSON neu dang object, giu nguyen neu da la string.
   */
  private serializeChanges(changes: CreateAuditLogDto['changes']): string | null {
    if (changes === null || changes === undefined) return null;
    if (typeof changes === 'string') return changes;
    try {
      return JSON.stringify(changes);
    } catch {
      return String(changes);
    }
  }
}
