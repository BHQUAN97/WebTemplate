import { PartialType } from '@nestjs/mapped-types';
import { CreateScenarioDto } from './create-scenario.dto.js';

/**
 * Update scenario — tat ca fields optional.
 */
export class UpdateScenarioDto extends PartialType(CreateScenarioDto) {}
