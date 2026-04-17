import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /auth/register — dang ky tai khoan moi.
   * Neu settings yeu cau email verification -> tra message yeu cau xac thuc
   * va KHONG set refresh cookie (user phai verify truoc).
   */
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 900000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.register(dto);
    if ('requiresVerification' in result) {
      return {
        message: result.message,
        requiresVerification: true,
      };
    }
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
    };
  }

  /**
   * POST /auth/login — dang nhap, tra access token + set refresh cookie.
   */
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 900000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const tokens = await this.authService.login(dto, ip, userAgent);
    this.setRefreshCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
    };
  }

  /**
   * POST /auth/refresh — refresh access token bang refresh token tu cookie hoac body.
   */
  @Public()
  @Throttle({ auth: { limit: 20, ttl: 900000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = req.cookies?.refreshToken || dto.refreshToken;
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const tokens = await this.authService.refreshToken(token, ip, userAgent);
    this.setRefreshCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
    };
  }

  /**
   * POST /auth/logout — revoke refresh token, xoa cookie.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = req.cookies?.refreshToken;
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  /**
   * POST /auth/change-password — doi mat khau (can dang nhap).
   * Throttle 5 req/15 phut — tranh brute-force password cu.
   */
  @Throttle({ auth: { limit: 5, ttl: 900000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto);
    return { message: 'Password changed successfully' };
  }

  /**
   * POST /auth/forgot-password — gui email reset mat khau.
   */
  @Public()
  @Throttle({ auth: { limit: 3, ttl: 900000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return {
      message: 'If your email is registered, you will receive a reset link',
    };
  }

  /**
   * POST /auth/reset-password — reset mat khau bang token tu email.
   */
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 900000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }

  /**
   * POST /auth/verify-email — xac thuc email bang token.
   */
  @Public()
  @Throttle({ auth: { limit: 10, ttl: 900000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }) {
    if (!body?.token) {
      throw new BadRequestException('token is required');
    }
    await this.authService.verifyEmail(body.token);
    return { message: 'Email verified successfully' };
  }

  /**
   * POST /auth/resend-verification — gui lai email xac thuc.
   * Throttle 3 req/15 phut — tranh spam mailbox.
   */
  @Public()
  @Throttle({ auth: { limit: 3, ttl: 900000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('email is required');
    }
    await this.authService.resendVerification(body.email);
    return {
      message:
        'If your email is registered and unverified, a new link has been sent',
    };
  }

  // ==========================================================================
  // OAUTH — Google / Facebook
  // Chi hoat dong khi OAUTH_*_ENABLED=true va strategies da register.
  // ==========================================================================

  /**
   * GET /auth/google — redirect sang Google consent screen.
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport se redirect — handler nay khong can body
  }

  /**
   * GET /auth/google/callback — Google callback sau khi user approve.
   * Set refresh cookie + redirect ve FE kem accessToken trong query string.
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    return this.handleOAuthCallback(req, res);
  }

  /**
   * GET /auth/facebook — redirect sang Facebook consent.
   */
  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {
    // Passport redirect
  }

  /**
   * GET /auth/facebook/callback — Facebook callback.
   */
  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: any, @Res() res: any) {
    return this.handleOAuthCallback(req, res);
  }

  /**
   * Shared logic cho callback — goi oauthLogin + redirect.
   */
  private async handleOAuthCallback(req: any, res: any): Promise<void> {
    try {
      const ip = req.ip || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const tokens = await this.authService.oauthLogin(
        req.user,
        ip,
        userAgent,
      );
      this.setRefreshCookie(res, tokens.refreshToken);
      const successUrl =
        this.configService.get<string>('oauth.successRedirect') ||
        'http://localhost:6000/auth/callback';
      res.redirect(`${successUrl}?token=${tokens.accessToken}`);
    } catch (err) {
      const failureUrl =
        this.configService.get<string>('oauth.failureRedirect') ||
        'http://localhost:6000/login?error=oauth';
      const msg = encodeURIComponent((err as Error).message || 'oauth_failed');
      res.redirect(`${failureUrl}&message=${msg}`);
    }
  }

  /**
   * Set refresh token vao httpOnly cookie (7 ngay).
   */
  private setRefreshCookie(res: any, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
