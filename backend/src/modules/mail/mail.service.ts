import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue.module.js';
import {
  EmailJobData,
  EmailJobAttachment,
} from '../../common/queue/email.processor.js';
import { SettingsService } from '../settings/settings.service.js';

/**
 * Attachment input cho MailService. `content` chap nhan Buffer (nhi phan)
 * hoac string (da la base64 / text). BullMQ serialize Buffer sang JSON
 * nen tai layer nay ta convert sang base64 truoc khi enqueue.
 */
export interface SendMailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

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
  /** Binary attachments — Buffer se duoc encode base64 de queue qua Redis. */
  attachments?: SendMailAttachment[];
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

    // Normalize attachments: Buffer -> base64 string (BullMQ luu JSON vao Redis,
    // khong ho tro raw Buffer — serializer se chuyen sang { type:'Buffer', data:[...] }
    // kem memory blow-up voi PDF lon. Dung base64 on dinh + gon hon).
    const attachmentsPayload: EmailJobAttachment[] | undefined =
      params.attachments && params.attachments.length > 0
        ? params.attachments.map((a) => {
            if (Buffer.isBuffer(a.content)) {
              return {
                filename: a.filename,
                content: a.content.toString('base64'),
                contentType: a.contentType,
                encoding: 'base64',
              };
            }
            // Da la string (caller da encode hoac la text content)
            return {
              filename: a.filename,
              content: a.content,
              contentType: a.contentType,
              encoding: 'utf8',
            };
          })
        : undefined;

    const job = await this.emailQueue.add('send', {
      to: params.to,
      templateName: params.template,
      variables: params.context || {},
      subjectOverride: params.subject,
      attachments: attachmentsPayload,
    });
    this.logger.log(
      `Queued email to ${params.to} template="${params.template}" job=${job.id}` +
        (attachmentsPayload
          ? ` attachments=${attachmentsPayload.length}`
          : ''),
    );
    return { jobId: job.id || null };
  }
}
