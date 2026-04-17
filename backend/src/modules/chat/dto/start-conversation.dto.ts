import {
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
  IsObject,
  IsString,
} from 'class-validator';
import {
  IsSafeText,
  IsVietnamPhone,
} from '../../../common/validators/index.js';
import { ChannelType } from '../chat.constants.js';
import type { ConversationMetadata } from '../entities/conversation.entity.js';

/**
 * DTO khoi tao conversation moi — customer gui tu widget chat.
 * Neu co `initialMessage`, service se tao message dau tien cung luc.
 */
export class StartConversationDto {
  @IsEnum(ChannelType)
  channel: ChannelType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsSafeText()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @IsOptional()
  @IsVietnamPhone()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsSafeText()
  subject?: string;

  @IsOptional()
  @IsObject()
  metadata?: ConversationMetadata;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @IsSafeText()
  initialMessage?: string;
}
