import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from '../../modules/reports/reports.service.js';
import { MailService } from '../../modules/mail/mail.service.js';
import { SettingsService } from '../../modules/settings/settings.service.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { UserRole } from '../constants/index.js';

/**
 * Cron weekly-report — gui sales report tuan qua cho admin moi Thu Hai 8h sang.
 * Hien tai chi dispatch email qua MailService (khong attach binary vi queue
 * email chi ho tro template Handlebars). De thuc su attach PDF, can mo rong
 * MailService cho phep attachments.
 *
 * TODO: extend MailService va EmailProcessor de ho tro attachments binary.
 */
@Injectable()
export class WeeklyReportCron {
  private readonly logger = new Logger(WeeklyReportCron.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly mailService: MailService,
    private readonly settingsService: SettingsService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_WEEK, { name: 'weekly-report' })
  async run(): Promise<void> {
    try {
      const enabled = await this.settingsService.getBoolean(
        'email.enabled',
        false,
      );
      if (!enabled) {
        this.logger.warn(
          'Weekly report cron: email.enabled=false — skip',
        );
        return;
      }

      // Lay date range tuan vua roi
      const to = new Date();
      const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dateFrom = from.toISOString();
      const dateTo = to.toISOString();

      // Gen report PDF (not used as attachment yet — see TODO above)
      const report = await this.reportsService.generate('sales', {
        dateFrom,
        dateTo,
        format: 'pdf',
      });
      this.logger.log(
        `Weekly report generated: ${report.filename} (${report.buffer.length} bytes)`,
      );

      // Lay danh sach admin
      const admins = await this.userRepo
        .createQueryBuilder('u')
        .where('u.deleted_at IS NULL')
        .andWhere('u.is_active = :active', { active: true })
        .andWhere('u.role = :role', { role: UserRole.ADMIN })
        .getMany();

      for (const admin of admins) {
        try {
          await this.mailService.sendMail({
            to: admin.email,
            template: 'weekly_report',
            context: {
              name: admin.name,
              period_from: dateFrom,
              period_to: dateTo,
              // Trong thoi gian cho extension attachment, ta chi gui link dashboard
              // hoac thong bao text. Template 'weekly_report' can duoc seed rieng.
            },
          });
        } catch (err) {
          this.logger.warn(
            `Weekly report email to ${admin.email} failed: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(`Weekly report dispatched to ${admins.length} admin(s)`);
    } catch (err) {
      this.logger.error(
        `Weekly report cron failed: ${(err as Error).message}`,
      );
    }
  }
}
