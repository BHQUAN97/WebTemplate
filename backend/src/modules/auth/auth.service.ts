import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { randomUUID } from 'crypto';
import { comparePassword, hashPassword } from '../../common/utils/hash.js';
import { sha256 } from '../../common/utils/hash.js';
import { ICurrentUser } from '../../common/interfaces/index.js';
import { TwoFactorService } from './two-factor.service.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth service — xu ly dang ky, dang nhap, refresh token, doi mat khau.
 * Refresh token duoc hash SHA256 truoc khi luu vao DB.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Dang ky tai khoan moi.
   */
  async register(dto: RegisterDto): Promise<TokenPair> {
    // Kiem tra email da ton tai
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    return this.generateTokens(user);
  }

  /**
   * Dang nhap — xac thuc email/password, tra ve access + refresh token.
   * Neu user bat 2FA -> bat buoc totp_code (6 chu so) hoac backup code.
   */
  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const user = await this.validateUser(dto.email, dto.password);

    // 2FA check — user da bat 2FA phai cung cap totp_code
    if (user.two_factor_enabled) {
      if (!dto.totp_code) {
        // FE bat modal nhap code khi thay error code nay
        throw new UnauthorizedException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Vui long nhap ma xac thuc 2FA',
        });
      }
      const ok = await this.twoFactorService.verify(user.id, dto.totp_code);
      if (!ok) {
        throw new UnauthorizedException({
          code: 'TWO_FACTOR_INVALID',
          message: 'Ma 2FA khong hop le',
        });
      }
    }

    // Cap nhat last_login_at
    await this.usersService.update(user.id, { last_login_at: new Date() } as any);

    return this.generateTokens(user, ip, userAgent);
  }

  /**
   * Xac thuc user bang email + password.
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  /**
   * Refresh token — verify hash, revoke cu, tao cap token moi (rotation).
   */
  async refreshToken(
    token: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    // Verify JWT refresh token
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Tim token hash trong DB
    const tokenHash = this.hashToken(token);
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token_hash: tokenHash, is_revoked: false },
      relations: ['user'],
    });

    if (!storedToken) {
      // Token reuse detection — revoke tat ca token cua user
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke token cu
    storedToken.is_revoked = true;
    await this.refreshTokenRepo.save(storedToken);

    // Tao cap token moi
    return this.generateTokens(storedToken.user, ip, userAgent);
  }

  /**
   * Logout — revoke refresh token hien tai.
   */
  async logout(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token_hash: tokenHash },
    });

    if (storedToken) {
      storedToken.is_revoked = true;
      await this.refreshTokenRepo.save(storedToken);
    }
  }

  /**
   * Doi mat khau — can xac thuc mat khau cu.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    const isMatch = await comparePassword(dto.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.usersService.update(userId, { password_hash: newHash } as any);

    // Revoke tat ca refresh token — bat buoc dang nhap lai
    await this.revokeAllUserTokens(userId);
  }

  /**
   * Quen mat khau — tao reset token, luu JTI vao user, queue email.
   * Khong log token ra console — bao mat.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Khong leak thong tin — van tra ve thanh cong
      return;
    }

    const resetSecret = this.configService.get<string>('jwt.resetSecret');
    if (!resetSecret) {
      throw new Error('[AuthService] jwt.resetSecret is not configured');
    }

    // Tao JTI duy nhat — luu vao user de token chi dung duoc 1 lan
    const jti = randomUUID();
    const resetExpires =
      this.configService.get<string>('jwt.resetExpires') || '1h';

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'reset', jti },
      {
        secret: resetSecret,
        expiresIn: resetExpires as any,
      },
    );

    // Luu JTI vao user — invalidate token cu (neu co)
    await this.usersService.update(user.id, {
      reset_token_jti: jti,
    } as any);

    // TODO: send via email via queue (khong log token — tranh leak)
    this.logger.log(`Password reset requested for ${dto.email}`);
    // Tranh warning: resetToken dung khi email service san sang
    void resetToken;
  }

  /**
   * Reset mat khau bang token tu email.
   * Verify JTI de dam bao token chi dung duoc 1 lan.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const resetSecret = this.configService.get<string>('jwt.resetSecret');
    if (!resetSecret) {
      throw new Error('[AuthService] jwt.resetSecret is not configured');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(dto.token, {
        secret: resetSecret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.type !== 'reset') {
      throw new BadRequestException('Invalid token type');
    }

    // Verify JTI — token da dung hoac bi superseded thi reject
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.reset_token_jti || user.reset_token_jti !== payload.jti) {
      throw new BadRequestException('Reset token already used or invalidated');
    }

    const newHash = await hashPassword(dto.newPassword);
    // Mark used: xoa JTI sau khi reset thanh cong
    await this.usersService.update(payload.sub, {
      password_hash: newHash,
      reset_token_jti: null,
    } as any);

    // Revoke tat ca refresh token
    await this.revokeAllUserTokens(payload.sub);
  }

  /**
   * Tao cap access + refresh token. Luu refresh token hash vao DB.
   */
  async generateTokens(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    if (!accessSecret || !refreshSecret) {
      throw new Error(
        '[AuthService] JWT secrets are not configured (accessSecret/refreshSecret)',
      );
    }

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: accessSecret,
      expiresIn: (this.configService.get<string>('jwt.accessExpires') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: refreshSecret,
      expiresIn: (this.configService.get<string>('jwt.refreshExpires') || '7d') as any,
    });

    // Luu refresh token hash vao DB
    const refreshExpires = this.configService.get<string>('jwt.refreshExpires') || '7d';
    const expiresAt = new Date();
    const days = parseInt(refreshExpires) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    const tokenEntity = this.refreshTokenRepo.create({
      user_id: user.id,
      token_hash: this.hashToken(refreshToken),
      ip_address: ip || null,
      user_agent: userAgent?.substring(0, 500) || null,
      expires_at: expiresAt,
    });
    await this.refreshTokenRepo.save(tokenEntity);

    return { accessToken, refreshToken };
  }

  /**
   * Hash token bang SHA256 — khong luu raw token trong DB.
   */
  hashToken(token: string): string {
    return sha256(token);
  }

  /**
   * Revoke tat ca refresh token cua user — dung khi doi password hoac detect reuse.
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user_id: userId, is_revoked: false },
      { is_revoked: true },
    );
    this.logger.warn(`Revoked all refresh tokens for user: ${userId}`);
  }
}
