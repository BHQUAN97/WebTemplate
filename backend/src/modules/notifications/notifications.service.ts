import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, LessThan } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Notification } from './entities/notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { NotificationsGateway } from './notifications.gateway.js';

/**
 * Notifications service — gui thong bao in-app, email, push.
 */
@Injectable()
export class NotificationsService extends BaseService<Notification> {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {
    super(notificationsRepository, 'Notification');
  }

  /**
   * Gui thong bao — tao record va emit socket event neu in_app.
   * Email delivery handled via queue in email-templates module.
   */
  async send(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.create({
      ...dto,
      channel: dto.channel || 'in_app',
      sent_at: new Date(),
    } as any);

    // Emit socket event cho in_app notification (bao gom ca multi-channel)
    if (notification.channel === 'in_app' || notification.channel === 'push') {
      this.gateway.emitToUser(
        notification.user_id,
        'notification:new',
        notification,
      );
    }

    // Email delivery handled via queue in email-templates module

    return notification;
  }

  /**
   * Gui email thong bao (placeholder — tich hop SMTP sau).
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // TODO: Tich hop nodemailer hoac SendGrid
    this.logger.log(`Send email to ${to}: ${subject}`);
  }

  /**
   * Danh dau da doc 1 thong bao.
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findById(id);
    if (notification.user_id !== userId) {
      throw new (await import('@nestjs/common')).ForbiddenException('Not your notification');
    }
    return this.update(id, {
      is_read: true,
      read_at: new Date(),
    } as any);
  }

  /**
   * Xoa 1 thong bao cua chinh user (soft delete). Tranh IDOR: verify ownership.
   */
  async removeOwned(id: string, userId: string): Promise<void> {
    const notification = await this.findById(id);
    if (notification.user_id !== userId) {
      throw new (await import('@nestjs/common')).ForbiddenException('Not your notification');
    }
    await this.softDelete(id);
  }

  /**
   * Danh dau tat ca thong bao cua user la da doc.
   */
  async markAllRead(userId: string): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true, read_at: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = :isRead', { isRead: false })
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  /**
   * Dem so thong bao chua doc cua user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: {
        user_id: userId,
        is_read: false,
        deleted_at: null as any,
      },
    });
  }

  /**
   * Gui thong bao hang loat cho nhieu user.
   */
  async sendBulk(
    userIds: string[],
    dto: Omit<CreateNotificationDto, 'user_id'>,
  ): Promise<number> {
    const notifications = userIds.map((userId) =>
      this.notificationsRepository.create({
        ...dto,
        user_id: userId,
        channel: dto.channel || 'in_app',
        sent_at: new Date(),
      }),
    );
    const saved = await this.notificationsRepository.save(notifications);
    return saved.length;
  }

  /**
   * Xoa hang loat cac thong bao da doc cua user hien tai (soft delete).
   * Dung cho bulk-delete o notification center.
   */
  async deleteReadByUser(userId: string): Promise<number> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .softDelete()
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NOT NULL')
      .andWhere('deleted_at IS NULL')
      .execute();

    return result.affected || 0;
  }

  /**
   * Xoa thong bao cu hon X ngay.
   */
  async deleteOld(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.notificationsRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .andWhere('is_read = :isRead', { isRead: true })
      .execute();

    return result.affected || 0;
  }

  /**
   * Override applyFilters — loc theo user_id (tu JWT), is_read, type.
   */
  protected applyFilters(
    qb: SelectQueryBuilder<Notification>,
    options: PaginationDto,
  ): void {
    const query = options as QueryNotificationsDto & { user_id?: string };

    // Uu tien loc theo user_id neu controller truyen xuong (tu JWT)
    if (query.user_id) {
      qb.andWhere('entity.user_id = :userId', { userId: query.user_id });
    }

    if (query.is_read !== undefined) {
      qb.andWhere('entity.is_read = :isRead', { isRead: query.is_read });
    }

    if (query.type) {
      qb.andWhere('entity.type = :type', { type: query.type });
    }
  }
}
