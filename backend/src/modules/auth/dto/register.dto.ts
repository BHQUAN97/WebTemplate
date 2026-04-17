import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Match } from './match.decorator.js';

export class RegisterDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mat khau phai co it nhat 8 ky tu' })
  @MaxLength(50, { message: 'Mat khau khong duoc qua 50 ky tu' })
  @Matches(/[A-Z]/, { message: 'Mat khau phai co it nhat 1 chu hoa' })
  @Matches(/[0-9]/, { message: 'Mat khau phai co it nhat 1 so' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'Mat khau phai co it nhat 1 ky tu dac biet',
  })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Ten phai co it nhat 2 ky tu' })
  @MaxLength(100, { message: 'Ten khong duoc qua 100 ky tu' })
  name: string;

  @IsString()
  @Match('password', { message: 'Mat khau xac nhan khong khop' })
  confirmPassword: string;
}
