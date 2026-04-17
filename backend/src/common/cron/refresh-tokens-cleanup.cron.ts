import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity.js';

/**
 * Cron don refresh tokens — chay hang ngay luc 4h sang.
 * Xoa:
 *  - Token da het han (expires_at < NOW).
 *  - Token da revoke > 30 ngay.
 */
@Injectable()
export class RefreshTokensCleanupCron {
  private readonly logger = new Logger(RefreshTokensCleanupCron.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'refresh-tokens-cleanup' })
  async cleanup(): Promise<void> {
    try {
      const now = new Date();

      // 1. Xoa token het han
      const expiredResult = await this.refreshTokenRepo
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('expires_at < :now', { now })
        .execute();

      // 2. Xoa token da revoke > 30 ngay
      // NOTE: RefreshToken khong co updated_at. Dung created_at lam dai dien
      // — van du vi mot token da revoke cu > 30 ngay chac chan khong con hop le.
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const revokedResult = await this.refreshTokenRepo
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('is_revoked = :revoked', { revoked: true })
        .andWhere('created_at < :cutoff', { cutoff })
        .execute();

      this.logger.log(
        `Refresh tokens cleanup: expired=${expiredResult.affected ?? 0}, revoked-old=${revokedResult.affected ?? 0}`,
      );
    } catch (err) {
      this.logger.error(
        `Refresh tokens cleanup failed: ${(err as Error).message}`,
      );
    }
  }
}
