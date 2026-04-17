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
   */
  @Post('import')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
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
