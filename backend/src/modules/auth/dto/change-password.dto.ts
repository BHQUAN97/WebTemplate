import { IsString } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/index.js';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
