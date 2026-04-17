import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog } from '../../modules/audit-logs/entities/audit-log.entity.js';
import { SettingsService } from '../../modules/settings/settings.service.js';

/**
 * Cron don audit logs cu — chay hang ngay luc 3h sang.
 * Retention default 90 ngay, co the override qua setting key `cron.audit_log_retention_days`.
 */
@Injectable()
export class AuditLogsCleanupCron {
  private readonly logger = new Logger(AuditLogsCleanupCron.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Thuc thi cleanup: xoa audit_logs co created_at cu hon retentionDays.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'audit-logs-cleanup' })
  async cleanup(): Promise<void> {
    try {
      const days = Number(
        await this.settingsService.getOrDefault(
          'cron.audit_log_retention_days',
          90,
        ),
      );
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await this.auditRepo
        .createQueryBuilder()
        .delete()
        .from(AuditLog)
        .where('created_at < :cutoff', { cutoff })
        .execute();

      this.logger.log(
        `Audit logs cleanup: deleted ${result.affected ?? 0} rows older than ${days} days`,
      );
    } catch (err) {
      this.logger.error(
        `Audit logs cleanup failed: ${(err as Error).message}`,
      );
    }
  }
}
