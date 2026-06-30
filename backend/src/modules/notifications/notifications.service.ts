import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, LessThan } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { OrderStatus } from '../../common/constants/index.js';
import { Notification } from './entities/notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { MailService } from '../mail/mail.service.js';
import { User } from '../users/entities/user.entity.js';
import { Order } from '../orders/entities/order.entity.js';

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
    private readonly mailService: MailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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
   * Gui email khi trang thai don hang thay doi.
   * Chi gui cho cac status quan trong: confirmed, shipping, delivered, cancelled.
   * Email fail → log warning, KHONG throw.
   */
  async sendOrderStatusEmail(
    userId: string,
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<void> {
    // Map status → label + message tieng Viet
    const statusMap: Partial<
      Record<OrderStatus, { label: string; message: string }>
    > = {
      [OrderStatus.CONFIRMED]: {
        label: 'Đã xác nhận',
        message: 'đã được xác nhận và đang chuẩn bị',
      },
      [OrderStatus.SHIPPING]: {
        label: 'Đang giao hàng',
        message: 'đang được giao đến bạn',
      },
      [OrderStatus.DELIVERED]: {
        label: 'Đã giao thành công',
        message: 'đã được giao thành công',
      },
      [OrderStatus.CANCELLED]: {
        label: 'Đã hủy',
        message: 'đã bị hủy',
      },
    };

    const statusInfo = statusMap[newStatus];
    if (!statusInfo) return; // Cac status khac khong can gui email

    try {
      // Lay thong tin user va don hang de dien vao template
      const [user, order] = await Promise.all([
        this.userRepository.findOne({ where: { id: userId } }),
        this.orderRepository.findOne({ where: { id: orderId } }),
      ]);

      if (!user || !order) {
        this.logger.warn(
          `sendOrderStatusEmail: user=${userId} or order=${orderId} not found — skipped`,
        );
        return;
      }

      await this.mailService.sendMail({
        to: user.email,
        template: 'order-status-update',
        context: {
          userName: user.name,
          orderNumber: order.order_number,
          statusLabel: statusInfo.label,
          statusMessage: statusInfo.message,
          updatedAt: new Date().toLocaleString('vi-VN'),
        },
      });
    } catch (err: any) {
      // Email fail khong anh huong luong chinh — chi log warning
      this.logger.warn(
        `sendOrderStatusEmail failed for order=${orderId} status=${newStatus}: ${err?.message}`,
      );
    }
  }

  /**
   * Gui email canh bao bao mat khi co hoat dong bat thuong.
   * Email fail → log warning, KHONG throw.
   */
  async sendSecurityAlert(
    userId: string,
    event: 'password_changed' | 'new_login',
    meta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    // Map event → tieu de va mo ta canh bao
    const alertMap: Record<
      string,
      { title: string; details: string }
    > = {
      password_changed: {
        title: 'Mật khẩu tài khoản đã được thay đổi',
        details:
          'Nếu không phải bạn thực hiện, hãy liên hệ ngay với chúng tôi để bảo vệ tài khoản.',
      },
      new_login: {
        title: 'Phát hiện đăng nhập từ thiết bị/IP mới',
        details: meta?.ip
          ? `IP đăng nhập: ${meta.ip}${meta.userAgent ? ` — ${meta.userAgent}` : ''}`
          : 'Đăng nhập từ thiết bị không quen thuộc được phát hiện.',
      },
    };

    const alert = alertMap[event];
    if (!alert) return;

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        this.logger.warn(
          `sendSecurityAlert: user=${userId} not found — skipped`,
        );
        return;
      }

      await this.mailService.sendMail({
        to: user.email,
        template: 'security-alert',
        context: {
          userName: user.name,
          alertTitle: alert.title,
          occurredAt: new Date().toLocaleString('vi-VN'),
          details: alert.details,
        },
      });
    } catch (err: any) {
      // Email fail khong anh huong luong chinh — chi log warning
      this.logger.warn(
        `sendSecurityAlert failed for user=${userId} event=${event}: ${err?.message}`,
      );
    }
  }

  /**
   * Danh dau da doc 1 thong bao — atomic UPDATE WHERE id+user_id.
   * Khong lam find truoc (chong race khi 2 PATCH cung luc).
   * Throw ForbiddenException neu khong tim thay row khop owner+id.
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true, read_at: new Date() })
      .where('id = :id', { id })
      .andWhere('user_id = :userId', { userId })
      .execute();

    if (!result.affected) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Notification not found or not your notification',
      );
    }
    return this.findById(id);
  }

  /**
   * Xoa 1 thong bao cua chinh user (soft delete). Tranh IDOR: verify ownership.
   */
  async removeOwned(id: string, userId: string): Promise<void> {
    const notification = await this.findById(id);
    if (notification.user_id !== userId) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Not your notification',
      );
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
