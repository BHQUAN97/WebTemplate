import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
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
  async sales(@Query() query: ReportQueryDto, @Res() res: Response) {
    return this.sendReport('sales', query, res);
  }

  @Get('products')
  @ApiOperation({ summary: 'Xuat products report' })
  async products(@Query() query: ReportQueryDto, @Res() res: Response) {
    return this.sendReport('products', query, res);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Xuat customers report' })
  async customers(@Query() query: ReportQueryDto, @Res() res: Response) {
    return this.sendReport('customers', query, res);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Xuat inventory snapshot report' })
  async inventory(@Query() query: ReportQueryDto, @Res() res: Response) {
    return this.sendReport('inventory', query, res);
  }

  /**
   * Helper chung: generate buffer + set headers + gui response.
   */
  private async sendReport(
    type: ReportType,
    query: ReportQueryDto,
    res: Response,
  ): Promise<void> {
    const { buffer, mimeType, filename } = await this.reportsService.generate(
      type,
      query,
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
