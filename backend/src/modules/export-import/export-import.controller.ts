import {
  Controller,
  Post,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExportImportService } from './export-import.service.js';
import { ExportDto, ExportFormat } from './dto/export.dto.js';
import { ImportDto } from './dto/import.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

@Controller()
export class ExportImportController {
  constructor(private readonly exportImportService: ExportImportService) {}

  /**
   * Export du lieu ra CSV/XLSX (admin only).
   */
  @Post('export')
  @Roles(UserRole.ADMIN)
  async exportData(
    @Body() dto: ExportDto,
    @CurrentUser() user: ICurrentUser,
    @Res() res: Response,
  ) {
    const buffer = await this.exportImportService.export(dto, user.id);

    const contentType =
      dto.format === ExportFormat.CSV
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const ext = dto.format === ExportFormat.CSV ? 'csv' : 'xlsx';
    const filename = `${dto.entity_type}_${Date.now()}.${ext}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Import du lieu tu file CSV/XLSX (admin only).
   * Gioi han: 10 MB, chi chap nhan MIME csv / xlsx de chong DoS + file bomb.
   */
  @Post('import')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = new Set([
          'text/csv',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(
            new Error(`MIME type "${file.mimetype}" khong duoc phep`),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async importData(
    @Body() dto: ImportDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: ICurrentUser,
  ) {
    const result = await this.exportImportService.import(
      dto.entity_type,
      file,
      user.id,
    );
    return successResponse(result, `Imported ${result.success} rows`);
  }
}
