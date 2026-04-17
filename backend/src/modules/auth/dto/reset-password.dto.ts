import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Mat khau phai co it nhat 8 ky tu' })
  @MaxLength(50, { message: 'Mat khau khong duoc qua 50 ky tu' })
  @Matches(/[A-Z]/, { message: 'Mat khau phai co it nhat 1 chu hoa' })
  @Matches(/[a-z]/, { message: 'Mat khau phai co it nhat 1 chu thuong' })
  @Matches(/[0-9]/, { message: 'Mat khau phai co it nhat 1 so' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'Mat khau phai co it nhat 1 ky tu dac biet',
  })
  newPassword: string;
}
