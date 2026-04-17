import { IsString, IsEnum } from 'class-validator';
import { ExportEntityType } from './export.dto.js';

export class ImportDto {
  @IsEnum(ExportEntityType)
  entity_type: ExportEntityType;
}
