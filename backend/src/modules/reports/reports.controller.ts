import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { ReportType } from './report.types.js';

/**
 * ReportsController — export report files cho admin/manager.
 * Moi endpoint tra file buffer voi Content-Disposition: attachment.
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Xuat sales report (xlsx/pdf/csv)' })
  async sales(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: ICurrentUser,
    @Res() res: Response,
  ) {
    return this.sendReport('sales', query, res, user);
  }

  @Get('products')
  @ApiOperation({ summary: 'Xuat products report' })
  async products(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: ICurrentUser,
    @Res() res: Response,
  ) {
    return this.sendReport('products', query, res, user);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Xuat customers report' })
  async customers(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: ICurrentUser,
    @Res() res: Response,
  ) {
    return this.sendReport('customers', query, res, user);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Xuat inventory snapshot report' })
  async inventory(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: ICurrentUser,
    @Res() res: Response,
  ) {
    return this.sendReport('inventory', query, res, user);
  }

  /**
   * Helper chung: generate buffer + set headers + gui response.
   * Tenant isolation: non-admin user (manager) chi thay du lieu trong
   * tenant cua minh. Admin (cross-tenant) co the truyen tenantId qua
   * query.tenantId neu can — hien tai default theo user.tenantId.
   */
  private async sendReport(
    type: ReportType,
    query: ReportQueryDto,
    res: Response,
    user: ICurrentUser,
  ): Promise<void> {
    // Manager bi rang buoc theo tenant cua minh; admin (root) thi tenantId
    // co the la null -> aggregate toan he thong (giu behavior cu).
    const tenantId =
      user.role === UserRole.ADMIN
        ? (user.tenantId ?? null)
        : (user.tenantId ?? null);
    const { buffer, mimeType, filename } = await this.reportsService.generate(
      type,
      query,
      tenantId,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }
}
