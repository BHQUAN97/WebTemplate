import { PartialType } from '@nestjs/mapped-types';
import { CreatePromotionDto } from './create-promotion.dto.js';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
