import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsBoolean,
  Matches,
} from 'class-validator';
import {
  IsSafeText,
  IsNotEmptyTrimmed,
} from '../../../common/validators/index.js';
import { ScheduleMode } from '../chat.constants.js';

// Regex "HH:mm" 00:00..23:59
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * DTO tao chat schedule — dinh nghia gio lam viec cua AI/agent.
 */
export class CreateScheduleDto {
  @IsString()
  @IsNotEmptyTrimmed()
  @MaxLength(100)
  @IsSafeText()
  name: string;

  // 0=Sunday..6=Saturday; null/omit = hang ngay
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @Matches(TIME_REGEX, { message: 'startTime phai dung dinh dang HH:mm' })
  startTime: string;

  @Matches(TIME_REGEX, { message: 'endTime phai dung dinh dang HH:mm' })
  endTime: string;

  @IsEnum(ScheduleMode)
  mode: ScheduleMode;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeText()
  fallbackMessage?: string;
}
