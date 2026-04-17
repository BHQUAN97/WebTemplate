import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue.module.js';
import {
  EmailJobData,
  EmailJobAttachment,
} from '../../common/queue/email.processor.js';
import { SettingsService } from '../settings/settings.service.js';
import { MediaService } from '../media/media.service.js';

/**
 * Nguong offload attachment sang S3. Attachment (Buffer) lon hon nguong
 * nay se duoc upload vao `tmp/mail-attach/` va chi s3Key di vao payload
 * queue — tranh phinh Redis khi gui weekly report PDF cho nhieu admin.
 */
export const ATTACHMENT_INLINE_LIMIT = 1 * 1024 * 1024; // 1MB

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
    private readonly mediaService: MediaService,
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

    // Normalize attachments:
    //  - Buffer > ATTACHMENT_INLINE_LIMIT -> upload S3, payload chi co s3Key.
    //  - Buffer <= limit -> base64 inline (BullMQ khong ho tro raw Buffer).
    //  - string -> utf8 inline.
    let attachmentsPayload: EmailJobAttachment[] | undefined;
    if (params.attachments && params.attachments.length > 0) {
      attachmentsPayload = await Promise.all(
        params.attachments.map(async (a) => {
          if (Buffer.isBuffer(a.content)) {
            if (a.content.length > ATTACHMENT_INLINE_LIMIT) {
              const { key } = await this.mediaService.uploadTempAttachment(
                a.content,
                a.filename,
                a.contentType || 'application/octet-stream',
              );
              return {
                filename: a.filename,
                contentType: a.contentType,
                s3Key: key,
              };
            }
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
        }),
      );
    }

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
