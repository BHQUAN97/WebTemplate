import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  user_id: string;

  @IsString()
  @MaxLength(50)
  type: 'order_status' | 'review_reply' | 'promotion' | 'system' | 'welcome';

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: { link?: string; entity_type?: string; entity_id?: string };

  @IsOptional()
  @IsEnum(['in_app', 'email', 'push'])
  channel?: 'in_app' | 'email' | 'push';
}
