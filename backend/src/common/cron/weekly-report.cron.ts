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
 * Dinh kem file PDF (generate qua ReportsService.generateSalesPdf).
 *
 * Flow:
 *   1. Check settings.email.enabled — neu off -> skip + warn.
 *   2. Tinh khoang [Monday tuan truoc, Sunday tuan truoc] (de bao gom
 *      tron 7 ngay cuoi cung, khong lan sang tuan hien tai).
 *   3. Gen PDF buffer tu sales report.
 *   4. Enumerate admin active -> enqueue email voi attachment = PDF.
 *   5. Loi cho 1 admin khong lam fail toan bo batch.
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

      // Range: tuan truoc (Thu 2 00:00 -> CN 23:59:59 tuan truoc)
      const { lastMonday, lastSunday } = this.getLastWeekRange();
      const dateFromIso = lastMonday.toISOString();
      const dateToIso = lastSunday.toISOString();
      const dateFromLabel = lastMonday.toISOString().slice(0, 10);
      const dateToLabel = lastSunday.toISOString().slice(0, 10);

      // Gen PDF attachment
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await this.reportsService.generateSalesPdf({
          dateFrom: lastMonday,
          dateTo: lastSunday,
        });
      } catch (err) {
        this.logger.error(
          `Weekly report PDF gen failed: ${(err as Error).message}`,
        );
        return;
      }

      // Lay summary tu sales report (reuse de embed vao email body)
      const salesPayload = await this.reportsService.getSalesReport({
        dateFrom: dateFromIso,
        dateTo: dateToIso,
      });
      const totalOrdersCard = salesPayload.summary.find(
        (c) => c.label === 'Total orders',
      );
      const totalRevenueCard = salesPayload.summary.find(
        (c) => c.label === 'Total revenue',
      );
      const topProductsTable = salesPayload.tables.find(
        (t) => t.title === 'Top 10 products',
      );
      const topProductsStr =
        topProductsTable?.rows
          .slice(0, 5)
          .map(
            (r, i) =>
              `${i + 1}. ${r.name} — ${r.units} units (${r.revenue})`,
          )
          .join('\n') || '-';

      // Lay danh sach admin
      const admins = await this.userRepo
        .createQueryBuilder('u')
        .where('u.deleted_at IS NULL')
        .andWhere('u.is_active = :active', { active: true })
        .andWhere('u.role = :role', { role: UserRole.ADMIN })
        .getMany();

      let sent = 0;
      for (const admin of admins) {
        try {
          await this.mailService.sendMail({
            to: admin.email,
            template: 'weekly_report',
            context: {
              name: admin.name,
              dateFrom: dateFromLabel,
              dateTo: dateToLabel,
              totalOrders: String(totalOrdersCard?.value ?? 0),
              totalRevenue: String(totalRevenueCard?.value ?? '0 VND'),
              topProducts: topProductsStr,
            },
            attachments: [
              {
                filename: `weekly-report-${dateFromLabel}_${dateToLabel}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });
          sent += 1;
        } catch (err) {
          this.logger.warn(
            `Weekly report email to ${admin.email} failed: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Weekly report dispatched to ${sent}/${admins.length} admin(s) ` +
          `[${dateFromLabel} .. ${dateToLabel}] pdf=${pdfBuffer.length}B`,
      );
    } catch (err) {
      this.logger.error(
        `Weekly report cron failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Tinh khoang tuan truoc: Thu Hai 00:00:00 UTC -> Chu Nhat 23:59:59 UTC.
   * Viec nay chay sau khi cron fire (EVERY_WEEK = Chu Nhat 0h cua node-cron),
   * nen "tuan truoc" luon la 7 ngay lien truoc thoi diem hien tai.
   */
  private getLastWeekRange(): { lastMonday: Date; lastSunday: Date } {
    const now = new Date();
    // Lui ve Chu Nhat gan nhat (end of last week)
    const day = now.getUTCDay(); // 0 = CN, 1 = Thu 2, ... 6 = Thu 7
    const daysSinceSunday = day === 0 ? 7 : day; // neu hom nay CN, tinh CN truoc
    const lastSunday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysSinceSunday,
        23,
        59,
        59,
        999,
      ),
    );
    const lastMonday = new Date(lastSunday.getTime());
    lastMonday.setUTCDate(lastSunday.getUTCDate() - 6);
    lastMonday.setUTCHours(0, 0, 0, 0);
    return { lastMonday, lastSunday };
  }
}
