import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { IsULID } from '../../../common/validators/index.js';
import {
  ChannelType,
  ConversationStatus,
  ScheduleMode,
} from '../chat.constants.js';

/**
 * Query DTO cho admin list conversations — ho tro filter + pagination.
 */
export class ListConversationsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsEnum(ScheduleMode)
  mode?: ScheduleMode;

  @IsOptional()
  @IsULID()
  agentId?: string;

  @IsOptional()
  @IsEnum(ChannelType)
  channel?: ChannelType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
