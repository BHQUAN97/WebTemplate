import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity.js';
import { comparePassword } from '../../common/utils/hash.js';
import { sha256 } from '../../common/utils/hash.js';
import { decrypt, encrypt } from '../../common/utils/crypto.util.js';

/**
 * Ket qua setup 2FA — tra ve cho client de hien QR code.
 */
export interface TwoFactorSetupResult {
  secret: string;
  qrCodeDataUrl: string;
  otpauthUrl: string;
}

/**
 * Service xu ly 2FA (TOTP): tao secret, verify code, enable/disable,
 * sinh va verify backup codes. Secret duoc ma hoa AES-256-GCM truoc khi luu DB.
 * Backup codes duoc hash SHA-256 truoc khi luu.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactorService');
  private readonly issuer: string;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.issuer =
      this.configService.get<string>('app.name') || 'WebTemplate';
  }

  /**
   * Lay encryption key tu env. Throw neu thieu — khong co fallback insecure.
   */
  private getEncryptionKey(): string {
    const key =
      this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY') ||
      process.env.TWO_FACTOR_ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        '[TwoFactorService] TWO_FACTOR_ENCRYPTION_KEY is not configured (must be 64 hex chars / 32 bytes)',
      );
    }
    return key;
  }

  /**
   * Sinh TOTP instance tu base32 secret + user email.
   */
  private buildTotp(secretBase32: string, label: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
      issuer: this.issuer,
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
  }

  /**
   * Buoc 1: sinh secret moi + QR code. Luu encrypted secret nhung
   * CHUA set two_factor_enabled = true (se enable sau khi verify).
   */
  async generateSecret(userId: string): Promise<TwoFactorSetupResult> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: this.issuer,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Ma hoa secret truoc khi luu — khong luu plaintext
    const encrypted = encrypt(secret.base32, this.getEncryptionKey());
    await this.userRepo.update(userId, {
      two_factor_secret: encrypted,
      two_factor_enabled: false,
    } as any);

    this.logger.log(`2FA secret generated for user: ${userId}`);
    return { secret: secret.base32, qrCodeDataUrl, otpauthUrl };
  }

  /**
   * Buoc 2: user nhap code de xac nhan authenticator da setup dung.
   * Neu code dung -> bat two_factor_enabled = true.
   */
  async enable(userId: string, code: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!user.two_factor_secret) {
      throw new BadRequestException(
        'Ban phai goi /auth/2fa/setup truoc khi enable',
      );
    }

    const ok = await this.verifyCode(user, code);
    if (!ok) {
      throw new BadRequestException('Ma 2FA khong hop le');
    }

    await this.userRepo.update(userId, {
      two_factor_enabled: true,
    } as any);
    this.logger.log(`2FA enabled for user: ${userId}`);
  }

  /**
   * Verify code cho login flow hoac action bao mat khac.
   * Return true neu code hop le (6 chu so TOTP hoac backup code).
   */
  async verify(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || !user.two_factor_secret) return false;
    return this.verifyCode(user, code);
  }

  /**
   * Internal: verify TOTP hoac backup code cho user da load.
   * - TOTP (6 digits): check qua authenticator secret
   * - Backup code (8 hex chars): hash + so sanh + remove khoi array sau khi dung
   */
  private async verifyCode(user: User, code: string): Promise<boolean> {
    const trimmed = code.replace(/\s/g, '');

    // TOTP code — 6 chu so
    if (/^\d{6}$/.test(trimmed)) {
      try {
        const secretBase32 = decrypt(
          user.two_factor_secret as string,
          this.getEncryptionKey(),
        );
        const totp = this.buildTotp(secretBase32, user.email);
        const delta = totp.validate({ token: trimmed, window: 1 });
        return delta !== null;
      } catch (err) {
        this.logger.error(`2FA verify failed: ${(err as Error).message}`);
        return false;
      }
    }

    // Backup code — 8 ky tu hex (case-insensitive). Check trong backup_codes_hash.
    if (/^[A-Fa-f0-9]{8}$/.test(trimmed)) {
      if (!user.backup_codes_hash || user.backup_codes_hash.length === 0) {
        return false;
      }
      // Hash voi upper-case de khop voi format khi sinh (crypto -> uppercase hex)
      const candidateHash = sha256(trimmed.toUpperCase());
      const idx = user.backup_codes_hash.indexOf(candidateHash);
      if (idx === -1) return false;

      // Remove code da dung — single-use
      const remaining = [...user.backup_codes_hash];
      remaining.splice(idx, 1);
      await this.userRepo.update(user.id, {
        backup_codes_hash: remaining,
      } as any);
      this.logger.warn(`Backup code used for user ${user.id}`);
      return true;
    }

    return false;
  }

  /**
   * Disable 2FA — yeu cau xac nhan password de bao mat.
   * Xoa ca secret lan backup codes.
   */
  async disable(userId: string, currentPassword: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!user.password_hash) {
      // User OAuth khong co password -> khong the disable bang password
      throw new BadRequestException(
        'Tai khoan OAuth khong the tat 2FA bang password',
      );
    }
    const ok = await comparePassword(currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException('Mat khau khong dung');

    await this.userRepo.update(userId, {
      two_factor_secret: null,
      two_factor_enabled: false,
      backup_codes_hash: null,
    } as any);
    this.logger.log(`2FA disabled for user: ${userId}`);
  }

  /**
   * Sinh 10 backup codes moi (8 ky tu hex/code). Tra ve plaintext cho user
   * luu lai (hien MOT LAN duy nhat). Luu hash SHA-256 vao user.backup_codes_hash.
   * Goi method nay se ghi de backup codes cu (neu co).
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // 4 bytes -> 8 hex chars, uppercase cho de doc
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    // Luu hash — khong bao gio luu plaintext
    const hashes = codes.map((c) => sha256(c));
    await this.userRepo.update(userId, {
      backup_codes_hash: hashes,
    } as any);

    this.logger.log(`Backup codes generated for user ${userId}`);
    return codes;
  }

  /**
   * Regenerate backup codes — yeu cau password xac nhan truoc khi ghi de codes cu.
   * OAuth users khong co password se bi reject (khong phai luong thuong dung).
   */
  async regenerateBackupCodes(
    userId: string,
    currentPassword: string,
  ): Promise<string[]> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!user.password_hash) {
      throw new BadRequestException(
        'Tai khoan OAuth khong the regenerate backup codes bang password',
      );
    }
    const ok = await comparePassword(currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException('Mat khau khong dung');

    return this.generateBackupCodes(userId);
  }
}
