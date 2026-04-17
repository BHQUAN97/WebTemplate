import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ExportService } from './export.service.js';
import { ExportDataDto } from './dto/export-data.dto.js';
import { ExportPdfDto } from './dto/export-pdf.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';

/**
 * ExportController — generic export endpoint nhan JSON data tu FE va tra
 * file (CSV/XLSX). Khac voi /api/export (entity-based, ExportImportModule)
 * va /api/reports (pre-aggregated).
 */
@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * POST /api/export/csv — nhan data + columns, tra file CSV.
   */
  @Post('csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export array JSON ra CSV (admin/manager)' })
  async exportCsv(
    @Body() dto: ExportDataDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = this.exportService.toCsvBuffer(dto);
    const filename = this.sanitizeFilename(dto.filename || 'export', 'csv');
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }

  /**
   * POST /api/export/xlsx — nhan data, tra file Excel (.xlsx).
   */
  @Post('xlsx')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export array JSON ra XLSX (admin/manager)' })
  async exportXlsx(
    @Body() dto: ExportDataDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.toXlsxBuffer(dto);
    const filename = this.sanitizeFilename(dto.filename || 'export', 'xlsx');
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }

  /**
   * POST /api/export/pdf — nhan HTML da render tu FE, tra file PDF.
   *
   * Body: { html, filename?, options? { format, landscape, margins, printBackground } }
   * Puppeteer launch lazy — neu loi sai moi truong se throw 503.
   */
  @Post('pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export HTML sang PDF (admin/manager)' })
  async exportPdf(
    @Body() dto: ExportPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.generatePdf(dto.html, dto.options);
    const filename = this.sanitizeFilename(dto.filename || 'export', 'pdf');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }

  /**
   * Sanitize filename — chi giu alnum + dash/underscore/dot, force extension.
   */
  private sanitizeFilename(raw: string, ext: string): string {
    const base = raw
      .replace(/\.[^.]+$/, '')
      .replace(/[^A-Za-z0-9_\-]+/g, '_')
      .slice(0, 80) || 'export';
    return `${base}.${ext}`;
  }
}
