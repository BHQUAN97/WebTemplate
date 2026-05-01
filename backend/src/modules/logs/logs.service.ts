import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AccessLog } from './entities/access-log.entity.js';
import { Changelog } from './entities/changelog.entity.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';
import { PaginationMeta } from '../../common/utils/response.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * Service quan ly logs — append-only, KHONG extend BaseService.
 * Ghi audit log, access log va changelog.
 */
@Injectable()
export class LogsService {
  private readonly logger = new Logger('LogsService');

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(AccessLog)
    private readonly accessLogRepo: Repository<AccessLog>,
    @InjectRepository(Changelog)
    private readonly changelogRepo: Repository<Changelog>,
  ) {}

  /**
   * Ghi 1 audit log (ai lam gi voi entity nao).
   */
  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = this.auditLogRepo.create(data);
    const saved = await this.auditLogRepo.save(log);
    this.logger.debug(
      `Audit: ${data.action} ${data.entity_type} ${data.entity_id ?? ''}`,
    );
    return saved;
  }

  /**
   * Ghi 1 access log (HTTP request).
   */
  async createAccessLog(data: Partial<AccessLog>): Promise<AccessLog> {
    const log = this.accessLogRepo.create(data);
    return this.accessLogRepo.save(log);
  }

  /**
   * Truy van audit logs voi filter va phan trang.
   */
  async queryAuditLogs(
    options: QueryLogsDto,
  ): Promise<{ items: AuditLog[]; meta: PaginationMeta }> {
    const { page, limit, action, entity_type, user_id, date_from, date_to } =
      options;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (action) {
      qb.andWhere('log.action = :action', { action });
    }
    if (entity_type) {
      qb.andWhere('log.entity_type = :entity_type', { entity_type });
    }
    if (user_id) {
      qb.andWhere('log.user_id = :user_id', { user_id });
    }
    if (date_from) {
      qb.andWhere('log.created_at >= :date_from', { date_from });
    }
    if (date_to) {
      qb.andWhere('log.created_at <= :date_to', { date_to });
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
   * Truy van access logs voi phan trang.
   */
  async queryAccessLogs(
    options: PaginationDto,
  ): Promise<{ items: AccessLog[]; meta: PaginationMeta }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.accessLogRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { items, meta };
  }

  /**
   * Thong ke so luong log theo action trong khoang thoi gian.
   */
  async getStats(
    date_from?: string,
    date_to?: string,
  ): Promise<{ action: string; count: number }[]> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action');

    if (date_from) {
      qb.andWhere('log.created_at >= :date_from', { date_from });
    }
    if (date_to) {
      qb.andWhere('log.created_at <= :date_to', { date_to });
    }

    return qb.getRawMany();
  }

  /**
   * Tao 1 changelog entry (ghi nhan thay doi phien ban).
   */
  async createChangelog(data: Partial<Changelog>): Promise<Changelog> {
    const log = this.changelogRepo.create(data);
    const saved = await this.changelogRepo.save(log);
    this.logger.log(`Changelog: ${data.version} - ${data.title}`);
    return saved;
  }

  /**
   * Lay danh sach changelogs, moi nhat truoc.
   */
  async getChangelogs(): Promise<Changelog[]> {
    return this.changelogRepo.find({
      order: { created_at: 'DESC' },
    });
  }
}
