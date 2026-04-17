import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ValidateNested,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsSafeText,
  IsNotEmptyTrimmed,
} from '../../../common/validators/index.js';
import { MessageType } from '../chat.constants.js';

/**
 * Attachment DTO — validate tung item trong array attachments.
 */
export class ChatAttachmentDto {
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  url: string;

  @IsString()
  @MaxLength(100)
  mime: string;

  @IsInt()
  @Min(0)
  size: number;

  @IsString()
  @MaxLength(255)
  name: string;
}

/**
 * DTO gui message — customer hoac agent.
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmptyTrimmed()
  @MaxLength(5000)
  @IsSafeText()
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}
