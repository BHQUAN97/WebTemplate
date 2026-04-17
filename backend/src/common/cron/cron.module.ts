import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../modules/audit-logs/entities/audit-log.entity.js';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js';
import { WebhookDelivery } from '../../modules/webhooks/entities/webhook-delivery.entity.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { SettingsModule } from '../../modules/settings/settings.module.js';
import { ReportsModule } from '../../modules/reports/reports.module.js';
import { DeadLetterModule } from '../queue/dead-letter.module.js';
import { AuditLogsCleanupCron } from './audit-logs-cleanup.cron.js';
import { RefreshTokensCleanupCron } from './refresh-tokens-cleanup.cron.js';
import { WebhookRetryCron } from './webhook-retry.cron.js';
import { WeeklyReportCron } from './weekly-report.cron.js';

/**
 * CronModule — dang ky tat ca job chay theo schedule.
 * Yeu cau ScheduleModule.forRoot() da duoc goi o AppModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, RefreshToken, WebhookDelivery, User]),
    SettingsModule,
    ReportsModule,
    DeadLetterModule,
  ],
  providers: [
    AuditLogsCleanupCron,
    RefreshTokensCleanupCron,
    WebhookRetryCron,
    WeeklyReportCron,
  ],
})
export class CronModule {}
