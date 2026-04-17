import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailTemplateDto } from './create-email-template.dto.js';

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {}
