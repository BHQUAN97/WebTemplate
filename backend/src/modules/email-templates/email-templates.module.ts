import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { EmailTemplatesService } from './email-templates.service.js';
import { EmailTemplatesController } from './email-templates.controller.js';
import { EmailProcessor } from '../../common/queue/email.processor.js';

/**
 * EmailTemplatesModule — CRUD + render + enqueue send qua BullMQ.
 * EmailProcessor duoc dang ky o day de co access den EmailTemplate repo.
 * QueueModule @Global da dang ky BullModule.registerQueue('email') roi.
 */
@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate])],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService, EmailProcessor],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
