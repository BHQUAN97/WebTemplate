import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ContactStatus } from '../../../common/constants/index.js';

export class UpdateContactDto {
  @IsEnum(ContactStatus)
  status: ContactStatus;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  admin_notes?: string;
}
