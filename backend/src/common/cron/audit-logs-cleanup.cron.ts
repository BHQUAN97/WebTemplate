import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
   * BATCH DELETE 10K rows/lan + sleep 100ms — tranh lock DB hang phut khi
   * audit_logs co million+ rows.
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

      const BATCH = 10_000;
      const MAX_ITERATIONS = 1000; // safety cap = 10M rows max per cron run
      let totalDeleted = 0;
      let iter = 0;

      while (iter++ < MAX_ITERATIONS) {
        // Sub-query trick cho MySQL — DELETE ... LIMIT khong support voi
        // createQueryBuilder, dung raw query.
        const result = await this.auditRepo.query(
          `DELETE FROM audit_logs WHERE created_at < ? LIMIT ?`,
          [cutoff, BATCH],
        );
        const affected = (result as any).affectedRows ?? 0;
        totalDeleted += affected;
        if (affected < BATCH) break;
        // Sleep 100ms cho DB tho — khong block other queries
        await new Promise((r) => setTimeout(r, 100));
      }

      this.logger.log(
        `Audit logs cleanup: deleted ${totalDeleted} rows older than ${days} days (${iter} batches)`,
      );
    } catch (err) {
      this.logger.error(`Audit logs cleanup failed: ${(err as Error).message}`);
    }
  }
}
