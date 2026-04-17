import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue.module.js';
import { EmailJobData } from '../../common/queue/email.processor.js';
import { SettingsService } from '../settings/settings.service.js';

/**
 * Payload to gui email (wrapper tien dung). Dung
 * `template` (ten trong DB EmailTemplate) va truyen `context` — se
 * map sang `variables` cua EmailJobData.
 */
export interface SendMailParams {
  to: string;
  /** Ten template trong DB (email_templates.name). */
  template: string;
  /** Bien truyen vao Handlebars. */
  context?: Record<string, string>;
  /** Subject override (optional). */
  subject?: string;
}

/**
 * MailService — wrapper high-level cho cac module nghiep vu (auth, orders...)
 * goi gui email ma khong phai hieu ve queue.
 *
 * Ton trong flag `email.enabled` tu SettingsService: neu tat thi log warning
 * va return void (KHONG throw — tranh lam hong luong register khi email disabled).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue<EmailJobData>,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Queue 1 email gui o background. Ton trong flag email.enabled.
   * Tra ve job id neu da enqueue, null neu bi skip.
   */
  async sendMail(params: SendMailParams): Promise<{ jobId: string | null }> {
    const enabled = await this.settingsService.getBoolean(
      'email.enabled',
      false,
    );
    if (!enabled) {
      // Email disabled (dev mode hoac ca setting tat) — log du de debug
      this.logger.warn(
        `[email.enabled=false] Skipped email to=${params.to} template="${params.template}"`,
      );
      return { jobId: null };
    }

    const job = await this.emailQueue.add('send', {
      to: params.to,
      templateName: params.template,
      variables: params.context || {},
    });
    this.logger.log(
      `Queued email to ${params.to} template="${params.template}" job=${job.id}`,
    );
    return { jobId: job.id || null };
  }
}
