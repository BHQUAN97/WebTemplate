import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  IsStrongPassword,
  LIMITS,
  Match,
} from '../../../common/validators/index.js';

/**
 * DTO dang ky tai khoan moi.
 * Rule dong bo voi frontend/src/lib/validations/base.ts.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  @MaxLength(LIMITS.EMAIL_MAX, {
    message: `Email khong duoc qua ${LIMITS.EMAIL_MAX} ky tu`,
  })
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;

  @IsString()
  @MinLength(LIMITS.NAME_MIN, {
    message: `Ten phai co it nhat ${LIMITS.NAME_MIN} ky tu`,
  })
  @MaxLength(LIMITS.NAME_MAX, {
    message: `Ten khong duoc qua ${LIMITS.NAME_MAX} ky tu`,
  })
  name: string;

  @IsString()
  @Match('password', { message: 'Mat khau xac nhan khong khop' })
  confirmPassword: string;
}
