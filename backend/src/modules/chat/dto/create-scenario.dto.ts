import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  IsObject,
} from 'class-validator';
import {
  IsSafeText,
  IsNotEmptyTrimmed,
  IsULID,
} from '../../../common/validators/index.js';
import {
  MessageType,
  ScenarioTrigger,
} from '../chat.constants.js';
import type { ScenarioConditions } from '../entities/chat-scenario.entity.js';

/**
 * DTO tao scenario moi — admin dinh nghia trigger + template response.
 */
export class CreateScenarioDto {
  @IsString()
  @IsNotEmptyTrimmed()
  @MaxLength(100)
  @IsSafeText()
  name: string;

  @IsEnum(ScenarioTrigger)
  triggerType: ScenarioTrigger;

  @IsString()
  @IsNotEmptyTrimmed()
  @MaxLength(500)
  triggerValue: string;

  @IsOptional()
  @IsObject()
  conditions?: ScenarioConditions;

  @IsString()
  @IsNotEmptyTrimmed()
  @MaxLength(5000)
  response: string;

  @IsOptional()
  @IsEnum(MessageType)
  responseType?: MessageType;

  @IsOptional()
  @IsULID()
  followUpScenarioId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
