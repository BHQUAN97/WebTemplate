import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';

/**
 * Module cho audit logging.
 * Export ca AuditLogsService va AuditInterceptor de module khac co the dung.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditInterceptor],
  exports: [AuditLogsService, AuditInterceptor],
})
export class AuditLogsModule {}
