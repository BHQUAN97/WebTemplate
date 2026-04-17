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

/**
 * Payload cua email job.
 * - to: email nguoi nhan
 * - templateName: ten template trong DB (uu tien dung ten vi on dinh hon id)
 * - variables: bien de render Handlebars
 */
export interface EmailJobData {
  to: string;
  templateName: string;
  variables?: Record<string, string>;
  from?: string;
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

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly dlqService: DeadLetterService,
  ) {
    super();
    const apiKey = this.configService.get<string>('RESEND_API_KEY', '');
    this.resend = new Resend(apiKey);
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
        await this.dlqService.moveToDlq({
          originalQueue: QUEUE_NAMES.EMAIL,
          originalJobName: job.name,
          originalJobId: job.id,
          payload: job.data,
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
   */
  async process(job: Job<EmailJobData>): Promise<{ id?: string }> {
    const { to, templateName, variables = {}, from } = job.data;

    const template = await this.templateRepo.findOne({
      where: { name: templateName, is_active: true },
    });
    if (!template) {
      // Loi cau hinh — khong retry co y nghia nua
      throw new Error(`Email template "${templateName}" not found or inactive`);
    }

    // Compile Handlebars
    const subject = Handlebars.compile(template.subject)(variables);
    const html = Handlebars.compile(template.html_body)(variables);
    const text = template.text_body
      ? Handlebars.compile(template.text_body)(variables)
      : undefined;

    const result = await this.resend.emails.send({
      from: from || this.defaultFrom,
      to,
      subject,
      html,
      text,
    });

    const err: unknown = (result as any).error;
    if (err) {
      // Resend tra loi — throw de Bull retry
      this.logger.error(
        `Resend error for ${to} (${templateName}): ${JSON.stringify(err)}`,
      );
      throw new Error(
        typeof err === 'string' ? err : JSON.stringify(err),
      );
    }

    this.logger.log(
      `Email sent to ${to} via template "${templateName}" (id: ${result.data?.id})`,
    );
    return { id: result.data?.id };
  }
}
