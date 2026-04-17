import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import archiver from 'archiver';
import type Redis from 'ioredis';
import { User } from './entities/user.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Media } from '../media/entities/media.entity.js';
import { AuditLog } from '../audit-logs/entities/audit-log.entity.js';
import { REDIS_CLIENT } from '../../common/redis/redis.module.js';

/**
 * GDPR rate limit — 1 request/user/day. Luu tren Redis de share giua
 * nhieu instance va tu expire sau 24h (EXPIRE = 86400).
 * Key pattern: `gdpr_export:{userId}`.
 */
const GDPR_EXPORT_TTL_SECONDS = 24 * 60 * 60;

/**
 * GdprExportService — gather tat ca du lieu cua 1 user thanh ZIP bundle.
 *
 * Hien tai chay sync (tra Readable qua controller). Voi user nhieu data se
 * block request — tuong lai nen queue va email link S3.
 * TODO: Add async mode via BullMQ job `export-user-data` that uploads ZIP to
 *       S3 and emails pre-signed URL when done.
 */
@Injectable()
export class GdprExportService {
  private readonly logger = new Logger(GdprExportService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Rate-limit check: 1 export/user/day. Su dung Redis SET NX EX de
   * atomic — neu da ton tai key => tra ve ttl con lai va throw.
   */
  private async assertRateLimit(userId: string): Promise<void> {
    const key = `gdpr_export:${userId}`;
    // Set voi NX (only if not exists) + EX (TTL 24h). OK neu set thanh cong.
    const set = await this.redis.set(
      key,
      '1',
      'EX',
      GDPR_EXPORT_TTL_SECONDS,
      'NX',
    );
    if (set !== 'OK') {
      const ttl = await this.redis.ttl(key);
      const hours = ttl > 0 ? Math.ceil(ttl / 3600) : 24;
      throw new BadRequestException(
        `Ban da export trong 24h qua. Thu lai sau ${hours} gio.`,
      );
    }
  }

  /**
   * Export data thanh ZIP stream. Caller pipe stream vao HTTP response.
   * Throw NotFoundException neu user khong ton tai.
   */
  async exportUserDataZipStream(userId: string): Promise<Readable> {
    await this.assertRateLimit(userId);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Gather
    const orders = await this.orderRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    const orderIds = orders.map((o) => o.id);
    const orderItems = orderIds.length
      ? await this.orderItemRepo
          .createQueryBuilder('oi')
          .where('oi.order_id IN (:...ids)', { ids: orderIds })
          .getMany()
      : [];

    const media = await this.mediaRepo.find({
      where: { uploaded_by: userId },
      order: { created_at: 'DESC' },
    });

    const auditLogs = await this.auditLogRepo
      .createQueryBuilder('al')
      .where('al.user_id = :userId', { userId })
      .orderBy('al.created_at', 'DESC')
      .take(5000)
      .getMany();

    // Build profile object without sensitive fields
    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.role,
      is_active: user.is_active,
      is_email_verified: user.is_email_verified,
      provider: user.provider,
      two_factor_enabled: user.two_factor_enabled,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
    };

    // Orders with items embedded
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const it of orderItems) {
      const arr = itemsByOrder.get(it.order_id) || [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
    const ordersOut = orders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));

    const mediaList = media.map((m) => ({
      id: m.id,
      filename: m.original_name,
      mime_type: m.mime_type,
      size: m.size,
      url: m.url,
      folder: m.folder,
      created_at: m.created_at,
    }));

    // Build archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.append(JSON.stringify(profile, null, 2), { name: 'profile.json' });
    archive.append(JSON.stringify(ordersOut, null, 2), {
      name: 'orders.json',
    });
    archive.append(JSON.stringify(mediaList, null, 2), {
      name: 'media-list.json',
    });
    archive.append(JSON.stringify(auditLogs, null, 2), {
      name: 'audit-logs.json',
    });
    archive.append(this.buildReadme(user.email), { name: 'README.txt' });

    // Error log route
    archive.on('warning', (err) => {
      this.logger.warn(`archive warning: ${err.message}`);
    });
    archive.on('error', (err) => {
      this.logger.error(`archive error: ${err.message}`);
    });

    // Kick off finalize (streaming) — caller pipe khi san sang
    // Note: finalize() se chay async, stream consumer doc dan.
    void archive.finalize();

    return archive as unknown as Readable;
  }

  /**
   * Tao noi dung README.txt giai thich file trong bundle.
   */
  private buildReadme(email: string): string {
    return [
      'GDPR DATA EXPORT',
      '================',
      '',
      `Email: ${email}`,
      `Exported at: ${new Date().toISOString()}`,
      '',
      'Files included:',
      '  profile.json     — Personal profile (no passwords, secrets or OAuth tokens).',
      '  orders.json      — Orders and line items placed by this user.',
      '  media-list.json  — Media (files) uploaded by this user; URLs only.',
      '  audit-logs.json  — Up to 5000 most recent audit log entries involving this user.',
      '',
      'Your rights under GDPR:',
      '  - Right to access  : You have received a copy of your data in this archive.',
      '  - Right to rectify : Contact support to correct any inaccurate information.',
      '  - Right to erasure : You can request account deletion; some data may be',
      '                        retained for legal obligations (tax, fraud prevention).',
      '  - Right to portability : This export is in JSON — machine-readable format.',
      '  - Right to object  : You can object to processing at any time.',
      '',
      'For data subject access requests or to exercise any right, contact support.',
      '',
    ].join('\n');
  }
}
