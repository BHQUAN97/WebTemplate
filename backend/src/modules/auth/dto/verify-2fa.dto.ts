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
 * DTO de disable 2FA — yeu cau verify password hien tai truoc khi tat.
 */
export class Disable2FADto {
  @IsString()
  currentPassword: string;
}
