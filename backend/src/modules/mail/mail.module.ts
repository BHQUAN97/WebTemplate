import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { SettingsModule } from '../settings/settings.module.js';

/**
 * MailModule — global wrapper quanh BullMQ email queue + settings.
 * Marked @Global de bat ky module nao inject MailService khong phai import.
 *
 * Queue `email` da duoc register o QueueModule (@Global) tu truoc.
 * Processor (EmailProcessor) dinh nghia o common/queue/email.processor.ts.
 */
@Global()
@Module({
  imports: [SettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
