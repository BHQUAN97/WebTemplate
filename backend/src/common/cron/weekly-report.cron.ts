import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ReportsService } from '../../modules/reports/reports.service.js';
import { MailService } from '../../modules/mail/mail.service.js';
import { SettingsService } from '../../modules/settings/settings.service.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { Tenant } from '../../modules/tenants/entities/tenant.entity.js';
import { UserRole } from '../constants/index.js';

/**
 * Cron weekly-report — gui sales report tuan qua cho admin moi Thu Hai 8h sang.
 * Dinh kem file PDF + XLSX (generate qua ReportsService).
 *
 * Multi-tenant flow:
 *   1. Check settings.email.enabled — neu off -> skip + warn.
 *   2. Tinh khoang [Monday tuan truoc, Sunday tuan truoc].
 *   3. Liet ke active tenants:
 *      - Co tenant active -> moi tenant mot bao cao rieng, gui den admin
 *        thuoc tenant do (`User WHERE tenant_id = :tenantId AND role = ADMIN`).
 *      - Khong tenant nao active -> chay 1 lan voi tenantId=null,
 *        tat ca admin nhan bao cao tong (single-tenant mode).
 *   4. Loi cho 1 tenant/admin khong lam fail toan bo batch.
 *
 * Quan trong: KHONG bao gio gui report cua tenant A cho admin tenant B.
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
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Cron(CronExpression.EVERY_WEEK, { name: 'weekly-report' })
  async run(): Promise<void> {
    try {
      const enabled = await this.settingsService.getBoolean(
        'email.enabled',
        false,
      );
      if (!enabled) {
        this.logger.warn('Weekly report cron: email.enabled=false — skip');
        return;
      }

      const { lastMonday, lastSunday } = this.getLastWeekRange();
      const dateFromIso = lastMonday.toISOString();
      const dateToIso = lastSunday.toISOString();
      const dateFromLabel = lastMonday.toISOString().slice(0, 10);
      const dateToLabel = lastSunday.toISOString().slice(0, 10);

      // Liet ke active tenants
      const activeTenants = await this.tenantRepo.find({
        where: { is_active: true },
        order: { created_at: 'ASC' },
      });

      // Khong co tenant active -> single-tenant mode (backward compat)
      if (activeTenants.length === 0) {
        await this.dispatchForTenant({
          tenantId: null,
          tenantName: null,
          lastMonday,
          lastSunday,
          dateFromIso,
          dateToIso,
          dateFromLabel,
          dateToLabel,
        });
        return;
      }

      // Multi-tenant: moi tenant mot bao cao rieng
      let totalTenants = 0;
      for (const tenant of activeTenants) {
        try {
          await this.dispatchForTenant({
            tenantId: tenant.id,
            tenantName: tenant.name,
            lastMonday,
            lastSunday,
            dateFromIso,
            dateToIso,
            dateFromLabel,
            dateToLabel,
          });
          totalTenants += 1;
        } catch (err) {
          this.logger.warn(
            `Weekly report for tenant ${tenant.id} (${tenant.name}) failed: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(
        `Weekly report dispatched for ${totalTenants}/${activeTenants.length} tenant(s) ` +
          `[${dateFromLabel} .. ${dateToLabel}]`,
      );
    } catch (err) {
      this.logger.error(`Weekly report cron failed: ${(err as Error).message}`);
    }
  }

  /**
   * Gen + gui report cho 1 tenant. tenantId=null -> bao cao toan he thong,
   * gui den tat ca admin (single-tenant mode).
   */
  private async dispatchForTenant(args: {
    tenantId: string | null;
    tenantName: string | null;
    lastMonday: Date;
    lastSunday: Date;
    dateFromIso: string;
    dateToIso: string;
    dateFromLabel: string;
    dateToLabel: string;
  }): Promise<void> {
    const {
      tenantId,
      tenantName,
      lastMonday,
      lastSunday,
      dateFromIso,
      dateToIso,
      dateFromLabel,
      dateToLabel,
    } = args;

    // Gen PDF + XLSX song song — neu fail thi skip tenant nay
    let pdfBuffer: Buffer;
    let xlsxBuffer: Buffer;
    try {
      [pdfBuffer, xlsxBuffer] = await Promise.all([
        this.reportsService.generateSalesPdf({
          dateFrom: lastMonday,
          dateTo: lastSunday,
          tenantId,
        }),
        this.reportsService.generateSalesXlsx({
          dateFrom: lastMonday,
          dateTo: lastSunday,
          tenantId,
        }),
      ]);
    } catch (err) {
      this.logger.error(
        `Weekly report attachment gen failed (tenant=${tenantId ?? 'all'}): ${(err as Error).message}`,
      );
      return;
    }

    // Lay summary tu sales report (reuse de embed vao email body)
    const salesPayload = await this.reportsService.getSalesReport({
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      tenantId,
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
        .map((r, i) => `${i + 1}. ${r.name} — ${r.units} units (${r.revenue})`)
        .join('\n') || '-';

    // Lay danh sach admin THUOC tenant nay (security: khong leak cross-tenant)
    const adminQb = this.userRepo
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL')
      .andWhere('u.is_active = :active', { active: true })
      .andWhere('u.role = :role', { role: UserRole.ADMIN });
    if (tenantId) {
      // Multi-tenant: chi admin co tenant_id = tenantId
      adminQb.andWhere('u.tenant_id = :tenantId', { tenantId });
    } else {
      // Single-tenant fallback: lay admin khong gan tenant_id (root admins)
      const rootAdmins = await this.userRepo.find({
        where: {
          is_active: true,
          role: UserRole.ADMIN,
          tenant_id: IsNull(),
        },
      });
      if (rootAdmins.length > 0) {
        // Co root admin -> chi gui cho ho
        await this.sendToAdmins(rootAdmins, {
          tenantName,
          dateFromLabel,
          dateToLabel,
          totalOrdersCard,
          totalRevenueCard,
          topProductsStr,
          pdfBuffer,
          xlsxBuffer,
        });
        return;
      }
      // Khong co root admin -> fallback gui cho tat ca admin (legacy behavior)
    }

    const admins = await adminQb.getMany();

    if (admins.length === 0) {
      this.logger.warn(
        `Weekly report tenant=${tenantId ?? 'all'} (${tenantName ?? '-'}): khong co admin de gui`,
      );
      return;
    }

    await this.sendToAdmins(admins, {
      tenantName,
      dateFromLabel,
      dateToLabel,
      totalOrdersCard,
      totalRevenueCard,
      topProductsStr,
      pdfBuffer,
      xlsxBuffer,
    });

    this.logger.log(
      `Weekly report tenant=${tenantId ?? 'all'} (${tenantName ?? '-'}): ` +
        `${admins.length} admin(s) [${dateFromLabel}..${dateToLabel}] ` +
        `pdf=${pdfBuffer.length}B xlsx=${xlsxBuffer.length}B`,
    );
  }

  /**
   * Gui email cho 1 list admin. Loi cua tung admin khong lam fail batch.
   */
  private async sendToAdmins(
    admins: User[],
    ctx: {
      tenantName: string | null;
      dateFromLabel: string;
      dateToLabel: string;
      totalOrdersCard: { label: string; value: any } | undefined;
      totalRevenueCard: { label: string; value: any } | undefined;
      topProductsStr: string;
      pdfBuffer: Buffer;
      xlsxBuffer: Buffer;
    },
  ): Promise<void> {
    const tenantSuffix = ctx.tenantName ? `-${ctx.tenantName}` : '';
    for (const admin of admins) {
      try {
        await this.mailService.sendMail({
          to: admin.email,
          template: 'weekly_report',
          context: {
            name: admin.name,
            tenantName: ctx.tenantName ?? '',
            dateFrom: ctx.dateFromLabel,
            dateTo: ctx.dateToLabel,
            totalOrders: String(ctx.totalOrdersCard?.value ?? 0),
            totalRevenue: String(ctx.totalRevenueCard?.value ?? '0 VND'),
            topProducts: ctx.topProductsStr,
          },
          attachments: [
            {
              filename: `weekly-report${tenantSuffix}-${ctx.dateFromLabel}_${ctx.dateToLabel}.pdf`,
              content: ctx.pdfBuffer,
              contentType: 'application/pdf',
            },
            {
              filename: `weekly-report${tenantSuffix}-${ctx.dateFromLabel}_${ctx.dateToLabel}.xlsx`,
              content: ctx.xlsxBuffer,
              contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ],
        });
      } catch (err) {
        this.logger.warn(
          `Weekly report email to ${admin.email} failed: ${(err as Error).message}`,
        );
      }
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
