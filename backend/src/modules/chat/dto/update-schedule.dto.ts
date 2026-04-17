import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto.js';

/**
 * Update schedule — tat ca fields optional.
 */
export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
