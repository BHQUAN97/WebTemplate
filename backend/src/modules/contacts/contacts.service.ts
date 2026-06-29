import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Contact } from './entities/contact.entity.js';
import { ContactStatus } from '../../common/constants/index.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactsDto } from './dto/query-contacts.dto.js';
import { MailService } from '../mail/mail.service.js';

/**
 * Contacts service — quan ly form lien he, phan cong, thong ke.
 */
@Injectable()
export class ContactsService extends BaseService<Contact> {
  protected searchableFields = ['name', 'email', 'subject'];

  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepository: Repository<Contact>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    super(contactsRepository, 'Contact');
  }

  /**
   * Override create — gui email thong bao khi co lien he moi.
   */
  async createContact(dto: CreateContactDto): Promise<Contact> {
    const contact = await this.create(dto as any);

    this.logger.log(`New contact from ${dto.email}: ${dto.subject}`);

    // Gui email thong bao cho admin — wrap try/catch, khong throw de khong lam hong luong save
    try {
      const adminEmail =
        this.configService.get<string>('ADMIN_EMAIL') || 'admin@example.com';
      await this.mailService.sendMail({
        to: adminEmail,
        subject: `[Liên hệ mới] ${contact.subject}`,
        template: 'contact-notify',
        context: {
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          message: contact.message,
          createdAt: contact.created_at
            ? new Date(contact.created_at).toLocaleString('vi-VN')
            : '',
        },
      });
    } catch (err) {
      // Email fail KHONG duoc lan ra ngoai — chi log warning
      this.logger.warn(
        `[contacts] Gui email thong bao that bai: ${(err as Error).message}`,
      );
    }

    return contact;
  }

  /**
   * Cap nhat trang thai xu ly.
   */
  async updateStatus(id: string, status: ContactStatus): Promise<Contact> {
    const data: any = { status };
    if (status === ContactStatus.RESOLVED) {
      data.resolved_at = new Date();
    }
    return this.update(id, data);
  }

  /**
   * Phan cong xu ly cho admin/staff.
   */
  async assign(id: string, userId: string): Promise<Contact> {
    return this.update(id, {
      assigned_to: userId,
      status: ContactStatus.IN_PROGRESS,
    } as any);
  }

  /**
   * Thong ke so luong lien he theo trang thai.
   */
  async getStats(): Promise<Record<string, number>> {
    const rows = await this.contactsRepository
      .createQueryBuilder('entity')
      .select('entity.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('entity.deleted_at IS NULL')
      .groupBy('entity.status')
      .getRawMany();

    const stats: Record<string, number> = {};
    for (const row of rows) {
      stats[row.status] = parseInt(row.count);
    }
    return stats;
  }

  /**
   * Override applyFilters — loc theo status, assigned_to.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Contact>,
    options: PaginationDto,
  ): void {
    const query = options as QueryContactsDto;

    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }

    if (query.assigned_to) {
      qb.andWhere('entity.assigned_to = :assignedTo', {
        assignedTo: query.assigned_to,
      });
    }
  }
}
