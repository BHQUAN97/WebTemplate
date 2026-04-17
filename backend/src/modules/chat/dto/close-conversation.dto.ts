import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsSafeText } from '../../../common/validators/index.js';

/**
 * DTO dong conversation — optional khach co the danh gia + feedback.
 */
export class CloseConversationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeText()
  feedback?: string;
}
