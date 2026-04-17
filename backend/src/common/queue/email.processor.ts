import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import * as Handlebars from 'handlebars';
import { Resend } from 'resend';
import { EmailTemplate } from '../../modules/email-templates/entities/email-template.entity.js';
import { QUEUE_NAMES } from './queue.module.js';
import { DeadLetterService } from './dead-letter.service.js';
import { MediaService } from '../../modules/media/media.service.js';

/**
 * Attachment da serialize de put vao Redis via BullMQ.
 *
 * Hai mode:
 *  - inline: `content` la base64 (hoac utf8) — dung cho file nho (<1MB).
 *  - s3: `s3Key` tro toi object tren S3 (prefix `tmp/mail-attach/`) — worker
 *    download truoc khi gui Resend, delete sau khi gui thanh cong. Dung cho
 *    attachment lon de tranh phinh Redis.
 *
 * `encoding='base64'` -> processor se decode ve Buffer truoc khi pass sang Resend.
 * `encoding='utf8'` -> content da la string (vd CSV text), pass nguyen.
 * Neu thieu encoding, default base64 (backward compat).
 */
export interface EmailJobAttachment {
  filename: string;
  contentType?: string;
  /** Inline mode: base64/utf8 content. Absent khi dung s3Key. */
  content?: string;
  encoding?: 'base64' | 'utf8';
  /** S3 mode: key tro toi object tren tmp/mail-attach/ prefix. */
  s3Key?: string;
}

/**
 * Payload cua email job.
 * - to: email nguoi nhan
 * - templateName: ten template trong DB (uu tien dung ten vi on dinh hon id)
 * - variables: bien de render Handlebars
 * - subjectOverride: neu co, override subject tu template
 * - attachments: binary attachments da encode base64 (xem EmailJobAttachment)
 */
export interface EmailJobData {
  to: string;
  templateName: string;
  variables?: Record<string, string>;
  from?: string;
  subjectOverride?: string;
  attachments?: EmailJobAttachment[];
}

/**
 * EmailProcessor — worker xu ly gui email o background.
 * Khi fail thi throw de Bull tu dong retry theo default options (3 attempts, exponential).
 */
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly resend: Resend;
  private readonly defaultFrom: string;
  private readonly apiKeyPresent: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly dlqService: DeadLetterService,
    private readonly mediaService: MediaService,
  ) {
    super();
    const apiKey = this.configService.get<string>('RESEND_API_KEY', '');
    this.apiKeyPresent = !!apiKey;
    // Resend SDK yeu cau 1 string key — pass empty roi check `apiKeyPresent`
    // o `process()` de sking send khi chua config (khong throw).
    this.resend = new Resend(apiKey || 're_disabled_placeholder');
    this.defaultFrom = this.configService.get<string>(
      'EMAIL_FROM',
      this.configService.get<string>('MAIL_FROM', 'noreply@example.com'),
    );
  }

  /**
   * Khi job fail vinh vien (vuot attempts) -> luu vao dead letter queue.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<EmailJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts?.attempts ?? 3;
    if ((job.attemptsMade ?? 0) >= maxAttempts) {
      try {
        // Strip attachments payload truoc khi ghi DLQ — tranh phinh DB voi
        // base64 PDF. Giu lai s3Key (neu co) de manual replay sau nay;
        // S3 lifecycle rule se handle cleanup stale objects.
        const payloadForDlq = {
          ...job.data,
          attachments: job.data.attachments?.map((a) => ({
            filename: a.filename,
            contentType: a.contentType,
            encoding: a.encoding,
            contentLength: a.content?.length ?? 0,
            s3Key: a.s3Key,
          })),
        };
        await this.dlqService.moveToDlq({
          originalQueue: QUEUE_NAMES.EMAIL,
          originalJobName: job.name,
          originalJobId: job.id,
          payload: payloadForDlq,
          error: err?.message || String(err),
          attemptsMade: job.attemptsMade ?? 0,
          failedAt: new Date().toISOString(),
        });
      } catch (dlqErr) {
        this.logger.error(
          `Failed to move email job to DLQ: ${(dlqErr as Error).message}`,
        );
      }
    }
  }

  /**
   * Xu ly job "send" — render Handlebars tu template trong DB va gui qua Resend.
   * Neu co attachments, decode base64 -> Buffer va kem vao Resend payload.
   */
  async process(
    job: Job<EmailJobData>,
  ): Promise<{ id?: string; skipped?: boolean }> {
    const {
      to,
      templateName,
      variables = {},
      from,
      subjectOverride,
      attachments,
    } = job.data;

    // Guard: khong co RESEND_API_KEY -> log warning va resolve (khong throw,
    // khong retry). Matches hop dong "test khong co key = no-op".
    if (!this.apiKeyPresent) {
      this.logger.warn(
        `[RESEND_API_KEY missing] Skipped email to=${to} template="${templateName}"`,
      );
      return { skipped: true };
    }

    const template = await this.templateRepo.findOne({
      where: { name: templateName, is_active: true },
    });
    if (!template) {
      // Loi cau hinh — khong retry co y nghia nua
      throw new Error(`Email template "${templateName}" not found or inactive`);
    }

    // Compile Handlebars
    const subject = subjectOverride
      ? Handlebars.compile(subjectOverride)(variables)
      : Handlebars.compile(template.subject)(variables);
    const html = Handlebars.compile(template.html_body)(variables);
    const text = template.text_body
      ? Handlebars.compile(template.text_body)(variables)
      : undefined;

    // Decode attachments: ho tro 2 mode
    //  - s3Key: download tu S3 (offload payload lon khoi Redis)
    //  - inline: base64 / utf8 content truyen qua queue
    const resendAttachments = attachments
      ? await Promise.all(
          attachments.map(async (a) => {
            if (a.s3Key) {
              const content = await this.mediaService.downloadTempAttachment(
                a.s3Key,
              );
              return {
                filename: a.filename,
                content,
                contentType: a.contentType,
              };
            }
            const encoding = a.encoding ?? 'base64';
            const content =
              encoding === 'base64'
                ? Buffer.from(a.content ?? '', 'base64')
                : (a.content ?? '');
            return {
              filename: a.filename,
              content,
              contentType: a.contentType,
            };
          }),
        )
      : undefined;

    const result = await this.resend.emails.send({
      from: from || this.defaultFrom,
      to,
      subject,
      html,
      text,
      attachments: resendAttachments,
    });

    const err: unknown = (result as any).error;
    if (err) {
      // Resend tra loi — throw de Bull retry. KHONG delete S3 temp attachments
      // de retry lan sau co the reuse (BullMQ retry se goi lai process()).
      this.logger.error(
        `Resend error for ${to} (${templateName}): ${JSON.stringify(err)}`,
      );
      throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
    }

    // Success path — cleanup S3 temp attachments (best effort, khong fail job).
    if (attachments) {
      for (const a of attachments) {
        if (a.s3Key) {
          try {
            await this.mediaService.deleteTempAttachment(a.s3Key);
          } catch (cleanupErr) {
            this.logger.warn(
              `Failed to delete temp attachment ${a.s3Key}: ${(cleanupErr as Error).message}`,
            );
          }
        }
      }
    }

    this.logger.log(
      `Email sent to ${to} via template "${templateName}" (id: ${result.data?.id})` +
        (resendAttachments ? ` attachments=${resendAttachments.length}` : ''),
    );
    return { id: result.data?.id };
  }
}
