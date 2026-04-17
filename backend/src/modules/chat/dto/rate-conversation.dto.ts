import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsSafeText } from '../../../common/validators/index.js';

/**
 * DTO khach danh gia conversation sau khi close.
 */
export class RateConversationDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeText()
  feedback?: string;
}
