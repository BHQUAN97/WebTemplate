import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { ContactStatus } from '../../../common/constants/index.js';

export class QueryContactsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}
