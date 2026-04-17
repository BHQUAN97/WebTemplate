import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTranslationDto } from './create-translation.dto.js';

export class BulkTranslationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTranslationDto)
  translations: CreateTranslationDto[];
}
