import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TwoFactorService } from './two-factor.service.js';
import { Enable2FADto, Setup2FADto } from './dto/enable-2fa.dto.js';
import {
  Disable2FADto,
  RegenerateBackupCodesDto,
  Verify2FADto,
} from './dto/verify-2fa.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

/**
 * Controller 2FA — tat ca route deu require auth (khong @Public()).
 * Se di qua JwtAuthGuard global -> req.user co san.
 *
 * Throttle 10 req / 5 phut — han che brute-force TOTP (100 ma TOTP hop le thoi
 * vao moi cua so 30s khi nguoi tan cong co secret). Chi tight cho sensitive routes.
 */
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * POST /auth/2fa/setup — sinh secret + QR code. User scan QR vao app.
   * Chua enable — user phai verify code o buoc tiep theo.
   * Yeu cau currentPassword (step-up auth) — chong attacker chiem session
   * khoi tao 2FA cua minh tren account nan nhan (pre-empt 2FA hijack).
   * Throttle 10/5min de chong attacker token-hijack spam setup (lam roi keying).
   */
  @Throttle({ auth: { limit: 10, ttl: 300000 } })
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  async setup(@CurrentUser() user: ICurrentUser, @Body() dto: Setup2FADto) {
    const data = await this.twoFactorService.generateSecret(
      user.id,
      dto.currentPassword,
    );
    return successResponse(data, 'Scan QR code trong authenticator app');
  }

  /**
   * POST /auth/2fa/enable — verify code TOTP lan dau de bat 2FA.
   */
  @Throttle({ auth: { limit: 10, ttl: 300000 } })
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enable(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: Enable2FADto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await this.twoFactorService.enable(user.id, dto.code, ip, userAgent);
    return successResponse(null, '2FA da duoc bat');
  }

  /**
   * POST /auth/2fa/disable — tat 2FA, yeu cau xac nhan password VA TOTP/backup code
   * (step-up auth) de chong account takeover khi attacker chi co password.
   */
  @Throttle({ auth: { limit: 10, ttl: 300000 } })
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: Disable2FADto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await this.twoFactorService.disable(
      user.id,
      dto.currentPassword,
      dto.totpCode,
      ip,
      userAgent,
    );
    return successResponse(null, '2FA da duoc tat');
  }

  /**
   * POST /auth/2fa/verify — verify code (dung cho flow kiem tra step-up auth).
   */
  @Throttle({ auth: { limit: 10, ttl: 300000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@CurrentUser() user: ICurrentUser, @Body() dto: Verify2FADto) {
    const valid = await this.twoFactorService.verify(user.id, dto.code);
    return successResponse({ valid }, valid ? 'Ma hop le' : 'Ma khong hop le');
  }

  /**
   * POST /auth/2fa/backup-codes — sinh lai 10 backup codes.
   * Tra ve plaintext MOT LAN — user tu luu.
   * Yeu cau password de xac nhan (RegenerateBackupCodesDto chi co currentPassword,
   * khong yeu cau TOTP — flow nay khong xoa 2FA, chi rotate codes).
   */
  @Throttle({ auth: { limit: 10, ttl: 300000 } })
  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  async backupCodes(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: RegenerateBackupCodesDto,
  ) {
    const codes = await this.twoFactorService.regenerateBackupCodes(
      user.id,
      dto.currentPassword,
    );
    return successResponse(
      { codes },
      'Luu lai cac ma nay — chi hien thi 1 lan',
    );
  }
}
