import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
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
import { TwoFactorService } from './two-factor.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MailService } from '../mail/mail.service.js';
import { UserRole } from '../../common/constants/index.js';
import { REDIS_CLIENT } from '../../common/redis/redis.module.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Payload OAuth tu passport strategies (Google/Facebook).
 */
export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  name: string;
  avatar: string | null;
}

/**
 * Auth service — xu ly dang ky, dang nhap, refresh token, doi mat khau,
 * OAuth login, email verification, account lockout.
 *
 * Login-attempts tracker dung Redis. Key pattern: `login_attempts:{email}`.
 * Counter tang moi lan sai password, tu het han sau LOCKOUT_TTL_SECONDS.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  /** Gioi han so lan sai password lien tiep truoc khi khoa tam thoi. */
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  /** Thoi gian khoa sau khi vuot gioi han (giay) — dung cho Redis EXPIRE. */
  private readonly LOCKOUT_TTL_SECONDS = 15 * 60;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
    private readonly settingsService: SettingsService,
    private readonly mailService: MailService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Build Redis key cho login-attempts counter (lowercase email).
   */
  private attemptsKey(email: string): string {
    return `login_attempts:${email.toLowerCase()}`;
  }

  // ==========================================================================
  // REGISTER
  // ==========================================================================

  /**
   * Dang ky tai khoan moi.
   * - Neu email.enabled + email.verification_required: tao user voi
   *   is_email_verified=false, gui link verify, KHONG cap access token.
   * - Neu tat: auto mark email_verified=true, cap ngay access token.
   */
  async register(
    dto: RegisterDto,
  ): Promise<TokenPair | { message: string; requiresVerification: true }> {
    // Kiem tra email da ton tai
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const emailEnabled = await this.settingsService.getBoolean(
      'email.enabled',
      false,
    );
    const verifyRequired = await this.settingsService.getBoolean(
      'email.verification_required',
      false,
    );
    const welcomeEnabled = await this.settingsService.getBoolean(
      'email.welcome_enabled',
      false,
    );

    const passwordHash = await hashPassword(dto.password);
    // Tao user — neu verify required va email bat, set is_email_verified=false
    const shouldRequireVerify = emailEnabled && verifyRequired;
    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email,
        password_hash: passwordHash,
        name: dto.name,
        role: UserRole.USER,
        is_email_verified: !shouldRequireVerify,
      }),
    );

    // Queue welcome email neu bat
    if (emailEnabled && welcomeEnabled) {
      await this.mailService.sendMail({
        to: user.email,
        template: 'welcome',
        context: {
          user_name: user.name,
          site_name:
            this.configService.get<string>('app.name') || 'WebTemplate',
        },
      });
    }

    if (shouldRequireVerify) {
      // Sinh JWT verify token + luu JTI vao user
      await this.sendVerificationEmail(user);
      return {
        message:
          'Account created. Please check your email to verify your address before logging in.',
        requiresVerification: true,
      };
    }

    return this.generateTokens(user);
  }

  /**
   * Gui email xac thuc: sinh JWT type='email_verify' + luu JTI + queue mail.
   * Link trong mail: {frontendUrl}/verify-email?token=...
   */
  private async sendVerificationEmail(user: User): Promise<void> {
    const verifySecret =
      this.configService.get<string>('jwt.resetSecret') ||
      this.configService.get<string>('jwt.accessSecret');
    if (!verifySecret) {
      throw new Error(
        '[AuthService] jwt.resetSecret/accessSecret must be configured',
      );
    }

    const jti = randomUUID();
    const verifyToken = this.jwtService.sign(
      { sub: user.id, type: 'email_verify', jti },
      {
        secret: verifySecret,
        expiresIn: '24h' as any,
      },
    );

    await this.userRepo.update(user.id, {
      email_verification_jti: jti,
    } as any);

    const frontendUrl =
      this.configService.get<string>('MAIL_FRONTEND_URL') ||
      process.env.MAIL_FRONTEND_URL ||
      'http://localhost:6000';
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;

    await this.mailService.sendMail({
      to: user.email,
      template: 'verify_email',
      context: {
        user_name: user.name,
        verify_link: verifyLink,
      },
    });
  }

  /**
   * Verify email bang token — mark user.is_email_verified = true.
   */
  async verifyEmail(token: string): Promise<void> {
    const verifySecret =
      this.configService.get<string>('jwt.resetSecret') ||
      this.configService.get<string>('jwt.accessSecret');
    if (!verifySecret) {
      throw new Error('[AuthService] jwt verify secret not configured');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, { secret: verifySecret });
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
    if (payload.type !== 'email_verify') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (
      !user ||
      !user.email_verification_jti ||
      user.email_verification_jti !== payload.jti
    ) {
      throw new BadRequestException(
        'Verification token already used or invalidated',
      );
    }

    await this.userRepo.update(user.id, {
      is_email_verified: true,
      email_verification_jti: null,
    } as any);
    this.logger.log(`Email verified for user ${user.id}`);
  }

  /**
   * Resend verification email — yeu cau email, ne-op neu user khong ton tai
   * hoac da verify roi (khong leak info).
   */
  async resendVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.is_email_verified) return;

    const enabled = await this.settingsService.getBoolean(
      'email.enabled',
      false,
    );
    if (!enabled) return;

    await this.sendVerificationEmail(user);
  }

  // ==========================================================================
  // LOGIN
  // ==========================================================================

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
    await this.usersService.update(user.id, {
      last_login_at: new Date(),
    } as any);

    return this.generateTokens(user, ip, userAgent);
  }

  /**
   * Xac thuc user bang email + password — co account lockout sau 5 lan sai.
   * Throw khi vuot nguong voi message bao phut con lai. Dung Redis de share
   * counter giua cac instance + tu expire sau 15 phut.
   */
  async validateUser(email: string, password: string): Promise<User> {
    // Check lockout TRUOC khi so sanh password — tranh leak info + timing attack
    await this.checkLockout(email);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled');
    }

    // OAuth users khong co password -> neu login bang email/password, reject
    if (!user.password_hash) {
      throw new UnauthorizedException(
        'Account uses social login. Please sign in with your provider.',
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check email verification neu bat
    const emailEnabled = await this.settingsService.getBoolean(
      'email.enabled',
      false,
    );
    const verifyRequired = await this.settingsService.getBoolean(
      'email.verification_required',
      false,
    );
    if (emailEnabled && verifyRequired && !user.is_email_verified) {
      throw new UnauthorizedException(
        'Email not verified. Please check your inbox.',
      );
    }

    // Login thanh cong -> xoa counter
    await this.clearFailedAttempts(email);

    return user;
  }

  /**
   * Tang counter login attempts trong Redis. Set TTL = LOCKOUT_TTL_SECONDS
   * lan dau de key tu het han. Return count moi (debug/telemetry).
   */
  private async recordFailedAttempt(email: string): Promise<number> {
    const key = this.attemptsKey(email);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, this.LOCKOUT_TTL_SECONDS);
    }
    return count;
  }

  /**
   * Check xem email co dang bi lockout khong. Throw BadRequestException voi
   * so phut con lai neu vuot nguong. Khong throw neu TTL da het (race).
   */
  private async checkLockout(email: string): Promise<void> {
    const key = this.attemptsKey(email);
    const raw = await this.redis.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= this.MAX_LOGIN_ATTEMPTS) {
      const ttl = await this.redis.ttl(key);
      const minutes = ttl > 0 ? Math.ceil(ttl / 60) : 15;
      throw new BadRequestException(
        `Tai khoan tam khoa. Thu lai sau ${minutes} phut.`,
      );
    }
  }

  /**
   * Xoa counter sau khi dang nhap thanh cong.
   */
  private async clearFailedAttempts(email: string): Promise<void> {
    await this.redis.del(this.attemptsKey(email));
  }

  // ==========================================================================
  // OAUTH
  // ==========================================================================

  /**
   * Validate OAuth profile -> tim hoac tao user noi bo.
   * - Match theo email (OAuth email la trusted -> is_email_verified=true).
   * - Luu provider + provider_id de lien ket.
   * - Khong tao password_hash cho OAuth user.
   */
  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    let user = await this.usersService.findByEmail(profile.email);

    if (user) {
      // User da ton tai — link OAuth provider (neu chua) va bat is_email_verified
      const updates: Partial<User> = {};
      if (!user.provider) updates.provider = profile.provider;
      if (!user.provider_id) updates.provider_id = profile.providerId;
      if (!user.is_email_verified) updates.is_email_verified = true;
      if (!user.avatar_url && profile.avatar) {
        updates.avatar_url = profile.avatar;
      }
      if (Object.keys(updates).length > 0) {
        await this.userRepo.update(user.id, updates as any);
        user = (await this.userRepo.findOneBy({ id: user.id })) as User;
      }
    } else {
      // Tao user moi — password_hash = null (OAuth-only)
      user = await this.userRepo.save(
        this.userRepo.create({
          email: profile.email,
          password_hash: null,
          name: profile.name,
          avatar_url: profile.avatar,
          role: UserRole.USER,
          is_active: true,
          is_email_verified: true,
          provider: profile.provider,
          provider_id: profile.providerId,
        }),
      );
      this.logger.log(
        `Created OAuth user: ${user.email} via ${profile.provider}`,
      );
    }

    return user;
  }

  /**
   * OAuth login — goi sau khi strategy validate xong, sinh token pair.
   */
  async oauthLogin(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    await this.userRepo.update(user.id, {
      last_login_at: new Date(),
    } as any);
    return this.generateTokens(user, ip, userAgent);
  }

  // ==========================================================================
  // TOKEN MANAGEMENT
  // ==========================================================================

  /**
   * Refresh token — verify hash, revoke cu, tao cap token moi (rotation).
   */
  async refreshToken(
    token: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(token);
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token_hash: tokenHash, is_revoked: false },
      relations: ['user'],
    });

    if (!storedToken) {
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    storedToken.is_revoked = true;
    await this.refreshTokenRepo.save(storedToken);

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
    if (!user.password_hash) {
      throw new BadRequestException(
        'OAuth account khong the doi password — dang nhap qua provider',
      );
    }
    const isMatch = await comparePassword(
      dto.currentPassword,
      user.password_hash,
    );
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.usersService.update(userId, {
      password_hash: newHash,
    } as any);

    await this.revokeAllUserTokens(userId);
  }

  /**
   * Quen mat khau — tao reset token, luu JTI vao user, queue email.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Khong leak — tra ve thanh cong
      return;
    }
    if (!user.password_hash) {
      // OAuth user -> khong the reset password
      this.logger.warn(
        `forgotPassword: user ${user.id} is OAuth — skipping reset`,
      );
      return;
    }

    const resetSecret = this.configService.get<string>('jwt.resetSecret');
    if (!resetSecret) {
      throw new Error('[AuthService] jwt.resetSecret is not configured');
    }

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

    await this.usersService.update(user.id, {
      reset_token_jti: jti,
    } as any);

    const emailEnabled = await this.settingsService.getBoolean(
      'email.enabled',
      false,
    );
    const resetEnabled = await this.settingsService.getBoolean(
      'email.password_reset_enabled',
      true,
    );

    const frontendUrl =
      this.configService.get<string>('MAIL_FRONTEND_URL') ||
      process.env.MAIL_FRONTEND_URL ||
      'http://localhost:6000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    if (emailEnabled && resetEnabled) {
      await this.mailService.sendMail({
        to: user.email,
        template: 'password_reset',
        context: {
          user_name: user.name,
          reset_link: resetLink,
        },
      });
    } else {
      // Dev mode — log link de developer co the reset thu nghiem
      this.logger.warn(
        `[dev] password reset link for ${user.email}: ${resetLink}`,
      );
    }
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
      payload = this.jwtService.verify(dto.token, { secret: resetSecret });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.type !== 'reset') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.reset_token_jti || user.reset_token_jti !== payload.jti) {
      throw new BadRequestException('Reset token already used or invalidated');
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.usersService.update(payload.sub, {
      password_hash: newHash,
      reset_token_jti: null,
    } as any);

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
      expiresIn: (this.configService.get<string>('jwt.accessExpires') ||
        '15m') as any,
    });

    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: refreshSecret,
      expiresIn: (this.configService.get<string>('jwt.refreshExpires') ||
        '7d') as any,
    });

    const refreshExpires =
      this.configService.get<string>('jwt.refreshExpires') || '7d';
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
   * Revoke tat ca refresh token cua user — dung khi doi password / detect reuse
   * / admin soft-delete user.
   * PUBLIC de UsersService goi duoc khi soft delete.
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user_id: userId, is_revoked: false },
      { is_revoked: true },
    );
    this.logger.warn(`Revoked all refresh tokens for user: ${userId}`);
  }
}
