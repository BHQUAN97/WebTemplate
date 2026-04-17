import { IsString, Length, Matches } from 'class-validator';

/**
 * DTO de enable 2FA sau khi setup — user nhap code hien tai tu authenticator app.
 */
export class Enable2FADto {
  @IsString()
  @Length(6, 6, { message: 'Ma xac thuc phai co 6 chu so' })
  @Matches(/^\d{6}$/, { message: 'Ma xac thuc chi chua chu so' })
  code: string;
}

/**
 * DTO cho /auth/2fa/setup — yeu cau xac nhan password truoc khi tao secret moi.
 * Tranh attacker chiem session ngan han khoi tao 2FA cua minh tren account nan nhan
 * (pre-empt 2FA hijack).
 */
export class Setup2FADto {
  @IsString()
  currentPassword: string;
}
