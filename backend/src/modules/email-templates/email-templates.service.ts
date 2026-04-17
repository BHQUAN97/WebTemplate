import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseService } from '../../common/services/base.service.js';
import { EmailTemplate } from './entities/email-template.entity.js';
import { SendEmailDto } from './dto/send-email.dto.js';
import { QUEUE_NAMES } from '../../common/queue/queue.module.js';
import { EmailJobData } from '../../common/queue/email.processor.js';

/**
 * Quan ly email templates — render Handlebars + enqueue send job qua BullMQ.
 * Viec gui thuc te qua Resend nam o EmailProcessor (worker).
 */
@Injectable()
export class EmailTemplatesService extends BaseService<EmailTemplate> {
  protected searchableFields = ['name', 'subject'];

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue<EmailJobData>,
  ) {
    super(templateRepo, 'EmailTemplate');
  }

  /**
   * Render template Handlebars voi variables.
   */
  async render(
    templateName: string,
    variables: Record<string, string> = {},
  ): Promise<{ subject: string; html: string; text: string | null }> {
    const template = await this.getByName(templateName);

    const subjectTemplate = Handlebars.compile(template.subject);
    const htmlTemplate = Handlebars.compile(template.html_body);
    const textTemplate = template.text_body
      ? Handlebars.compile(template.text_body)
      : null;

    return {
      subject: subjectTemplate(variables),
      html: htmlTemplate(variables),
      text: textTemplate ? textTemplate(variables) : null,
    };
  }

  /**
   * Enqueue 1 email send job — Bull se retry 3 lan voi exponential backoff.
   * Worker (EmailProcessor) se render Handlebars + goi Resend SDK.
   */
  async send(dto: SendEmailDto): Promise<{ jobId: string | undefined }> {
    // Validate template ton tai (fail fast) truoc khi enqueue
    await this.getByName(dto.template_name);

    const job = await this.emailQueue.add(
      'send',
      {
        to: dto.to,
        templateName: dto.template_name,
        variables: dto.variables || {},
      },
      { jobId: undefined },
    );

    this.logger.log(
      `Queued email to ${dto.to} (template="${dto.template_name}", job=${job.id})`,
    );
    return { jobId: job.id };
  }

  /**
   * Helper gui nhanh khong qua DTO — cho cac module khac inject va goi truc tiep.
   */
  async sendEmail(
    to: string,
    templateName: string,
    variables: Record<string, string> = {},
  ): Promise<{ jobId: string | undefined }> {
    const job = await this.emailQueue.add('send', {
      to,
      templateName,
      variables,
    });
    return { jobId: job.id };
  }

  /**
   * Preview template — render voi sample variables, khong gui.
   */
  async preview(
    templateId: string,
    variables: Record<string, string> = {},
  ): Promise<{ subject: string; html: string; text: string | null }> {
    const template = await this.findById(templateId);

    const subjectTemplate = Handlebars.compile(template.subject);
    const htmlTemplate = Handlebars.compile(template.html_body);
    const textTemplate = template.text_body
      ? Handlebars.compile(template.text_body)
      : null;

    return {
      subject: subjectTemplate(variables),
      html: htmlTemplate(variables),
      text: textTemplate ? textTemplate(variables) : null,
    };
  }

  /**
   * Tim template theo name.
   */
  async getByName(name: string): Promise<EmailTemplate> {
    const template = await this.templateRepo.findOne({
      where: { name, is_active: true },
    });
    if (!template) {
      throw new Error(`Email template "${name}" not found`);
    }
    return template;
  }

  /**
   * Seed cac template mac dinh neu chua ton tai.
   */
  async seedDefaults(): Promise<void> {
    const defaults: Partial<EmailTemplate>[] = [
      {
        name: 'welcome',
        subject: 'Chao mung {{user_name}} den voi {{site_name}}!',
        html_body: `<h1>Chao mung ban, {{user_name}}!</h1>
<p>Cam on ban da dang ky tai khoan tai <strong>{{site_name}}</strong>.</p>
<p>Hay bat dau kham pha ngay!</p>`,
        text_body: 'Chao mung {{user_name}}! Cam on ban da dang ky tai {{site_name}}.',
        variables: ['user_name', 'site_name'],
      },
      {
        name: 'order_confirmation',
        subject: 'Xac nhan don hang #{{order_number}}',
        html_body: `<h1>Don hang #{{order_number}} da duoc xac nhan</h1>
<p>Xin chao {{user_name}},</p>
<p>Chung toi da nhan don hang cua ban voi tong gia tri: <strong>{{total}}</strong>.</p>
<p>Ban se nhan hang trong {{estimated_delivery}}.</p>`,
        text_body: 'Don hang #{{order_number}} da duoc xac nhan. Tong: {{total}}.',
        variables: ['user_name', 'order_number', 'total', 'estimated_delivery'],
      },
      {
        name: 'order_shipped',
        subject: 'Don hang #{{order_number}} dang duoc giao',
        html_body: `<h1>Don hang cua ban dang tren duong!</h1>
<p>Xin chao {{user_name}},</p>
<p>Don hang #{{order_number}} da duoc giao cho don vi van chuyen.</p>
<p>Ma van don: <strong>{{tracking_number}}</strong></p>`,
        text_body: 'Don hang #{{order_number}} dang giao. Ma van don: {{tracking_number}}.',
        variables: ['user_name', 'order_number', 'tracking_number'],
      },
      {
        name: 'password_reset',
        subject: 'Dat lai mat khau',
        html_body: `<h1>Dat lai mat khau</h1>
<p>Xin chao {{user_name}},</p>
<p>Nhan vao link sau de dat lai mat khau:</p>
<p><a href="{{reset_link}}">Dat lai mat khau</a></p>
<p>Link nay se het han sau 1 gio.</p>`,
        text_body: 'Dat lai mat khau: {{reset_link}}. Het han sau 1 gio.',
        variables: ['user_name', 'reset_link'],
      },
      {
        name: 'verify_email',
        subject: 'Xac thuc dia chi email',
        html_body: `<h1>Xac thuc email</h1>
<p>Xin chao {{user_name}},</p>
<p>Nhan vao link sau de xac thuc dia chi email cua ban:</p>
<p><a href="{{verify_link}}">Xac thuc email</a></p>
<p>Link nay se het han sau 24 gio. Neu ban khong dang ky tai khoan, vui long bo qua email nay.</p>`,
        text_body:
          'Xac thuc email: {{verify_link}} (het han sau 24 gio). Neu khong phai ban, bo qua email nay.',
        variables: ['user_name', 'verify_link'],
      },
      {
        name: 'review_request',
        subject: 'Danh gia san pham {{product_name}}',
        html_body: `<h1>Ban nghi gi ve {{product_name}}?</h1>
<p>Xin chao {{user_name}},</p>
<p>Ban da nhan san pham <strong>{{product_name}}</strong>. Hay danh gia de giup nguoi khac!</p>
<p><a href="{{review_link}}">Danh gia ngay</a></p>`,
        text_body: 'Danh gia {{product_name}}: {{review_link}}',
        variables: ['user_name', 'product_name', 'review_link'],
      },
      {
        name: '2fa_code',
        subject: 'Ma xac thuc 2 lop',
        html_body: `<h1>Ma xac thuc 2 lop</h1>
<p>Xin chao {{user_name}},</p>
<p>Ma xac thuc cua ban la: <strong style="font-size: 20px; letter-spacing: 2px;">{{code}}</strong></p>
<p>Ma nay se het han sau <strong>5 phut</strong>. Khong chia se ma voi bat ky ai.</p>
<p>Neu ban khong yeu cau ma nay, vui long bo qua email va doi mat khau ngay.</p>`,
        text_body:
          'Ma xac thuc 2 lop: {{code}}. Het han sau 5 phut. Khong chia se ma nay voi ai.',
        variables: ['user_name', 'code'],
      },
      {
        name: 'newsletter',
        subject: '{{subject_line}}',
        html_body: `<h1>{{title}}</h1>
<div>{{content}}</div>
<p><a href="{{unsubscribe_link}}">Huy dang ky</a></p>`,
        text_body: '{{title}}\n\n{{content}}\n\nHuy dang ky: {{unsubscribe_link}}',
        variables: ['subject_line', 'title', 'content', 'unsubscribe_link'],
      },
    ];

    for (const tpl of defaults) {
      const exists = await this.templateRepo.findOne({
        where: { name: tpl.name },
      });
      if (!exists) {
        await this.create(tpl as any);
        this.logger.log(`Seeded email template: ${tpl.name}`);
      }
    }
  }
}
