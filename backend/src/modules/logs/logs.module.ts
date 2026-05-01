import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AccessLog } from './entities/access-log.entity.js';
import { Changelog } from './entities/changelog.entity.js';
import { LogsService } from './logs.service.js';
import { LogsController } from './logs.controller.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, AccessLog, Changelog])],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
