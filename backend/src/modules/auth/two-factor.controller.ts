import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service.js';
import { Enable2FADto } from './dto/enable-2fa.dto.js';
import { Disable2FADto, Verify2FADto } from './dto/verify-2fa.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

/**
 * Controller 2FA — tat ca route deu require auth (khong @Public()).
 * Se di qua JwtAuthGuard global -> req.user co san.
 */
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * POST /auth/2fa/setup — sinh secret + QR code. User scan QR vao app.
   * Chua enable — user phai verify code o buoc tiep theo.
   */
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  async setup(@CurrentUser() user: ICurrentUser) {
    const data = await this.twoFactorService.generateSecret(user.id);
    return successResponse(data, 'Scan QR code trong authenticator app');
  }

  /**
   * POST /auth/2fa/enable — verify code TOTP lan dau de bat 2FA.
   */
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enable(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: Enable2FADto,
  ) {
    await this.twoFactorService.enable(user.id, dto.code);
    return successResponse(null, '2FA da duoc bat');
  }

  /**
   * POST /auth/2fa/disable — tat 2FA, yeu cau xac nhan password.
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: Disable2FADto,
  ) {
    await this.twoFactorService.disable(user.id, dto.currentPassword);
    return successResponse(null, '2FA da duoc tat');
  }

  /**
   * POST /auth/2fa/verify — verify code (dung cho flow kiem tra step-up auth).
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: Verify2FADto,
  ) {
    const valid = await this.twoFactorService.verify(user.id, dto.code);
    return successResponse({ valid }, valid ? 'Ma hop le' : 'Ma khong hop le');
  }

  /**
   * POST /auth/2fa/backup-codes — sinh lai 10 backup codes.
   * Tra ve plaintext MOT LAN — user tu luu.
   */
  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  async backupCodes(@CurrentUser() user: ICurrentUser) {
    const codes = await this.twoFactorService.generateBackupCodes(user.id);
    return successResponse(
      { codes },
      'Luu lai cac ma nay — chi hien thi 1 lan',
    );
  }
}
