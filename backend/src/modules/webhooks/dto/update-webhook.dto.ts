import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookDto } from './create-webhook.dto.js';

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {}
