import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mat khau phai co it nhat 6 ky tu' })
  password: string;

  /**
   * Ma 2FA TOTP (6 chu so) hoac backup code (8 ky tu).
   * Chi bat buoc khi user da enable 2FA — neu thieu, server tra
   * error code TWO_FACTOR_REQUIRED de FE hien modal nhap code.
   */
  @IsOptional()
  @IsString()
  @Length(6, 8, { message: 'Ma 2FA phai co 6-8 ky tu' })
  totp_code?: string;
}
