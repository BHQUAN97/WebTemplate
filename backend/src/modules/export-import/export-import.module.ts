import { Module } from '@nestjs/common';
import { ExportImportService } from './export-import.service.js';
import { ExportImportController } from './export-import.controller.js';

@Module({
  controllers: [ExportImportController],
  providers: [ExportImportService],
  exports: [ExportImportService],
})
export class ExportImportModule {}
