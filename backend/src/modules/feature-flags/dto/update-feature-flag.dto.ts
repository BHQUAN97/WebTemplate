import { PartialType } from '@nestjs/mapped-types';
import { CreateFeatureFlagDto } from './create-feature-flag.dto.js';

/**
 * Update DTO — tat ca field optional, ke thua validate rules tu create DTO.
 */
export class UpdateFeatureFlagDto extends PartialType(CreateFeatureFlagDto) {}
