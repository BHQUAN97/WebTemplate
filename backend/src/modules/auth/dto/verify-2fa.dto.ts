import { IsString, Length } from 'class-validator';

/**
 * DTO de verify 2FA code — dung trong login flow hoac cac action bao mat.
 * Cho phep 6 ky tu (TOTP) hoac 8 ky tu (backup code) — se merge vao service.
 */
export class Verify2FADto {
  @IsString()
  @Length(6, 8, { message: 'Ma xac thuc phai co 6-8 ky tu' })
  code: string;
}

/**
 * DTO de disable 2FA — yeu cau verify password + TOTP/backup code hien tai
 * (step-up auth) truoc khi tat. Bao dam attacker chi co password khong the
 * disable 2FA neu khong con quyen truy cap authenticator/backup codes.
 */
export class Disable2FADto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(6, 8, { message: 'Ma 2FA phai co 6-8 ky tu' })
  totpCode: string;
}

/**
 * DTO de regenerate backup codes — yeu cau password (khong yeu cau TOTP vi flow
 * nay khong xoa 2FA, chi rotate codes; user da co session active).
 */
export class RegenerateBackupCodesDto {
  @IsString()
  currentPassword: string;
}
