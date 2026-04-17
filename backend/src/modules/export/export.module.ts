import { Module } from '@nestjs/common';
import { ExportController } from './export.controller.js';
import { ExportService } from './export.service.js';

/**
 * ExportModule — generic `/api/export/{csv,xlsx}` endpoint cho FE truyen
 * du lieu da chuan bi san (khong phai entity-based).
 *
 * Khong dung chung controller voi ExportImportModule (vi module do dung
 * path `/export` cho bulk entity export) — module nay prefix `/export/csv`
 * va `/export/xlsx` nen khong xung dot.
 */
@Module({
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
